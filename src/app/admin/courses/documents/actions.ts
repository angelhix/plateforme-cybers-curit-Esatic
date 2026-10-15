'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

const COURSE_PATH = '/admin/courses';
const COURSE_DOCUMENT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;
const DOCUMENT_KINDS = new Set(['PREPARATORY', 'PRACTICAL']);
const DOCUMENT_FORMATS = new Set(['PDF', 'HTML']);

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? '').trim();
}

function validationRedirect(path: string, code: string): never {
  redirect(`${path}?error=${code}`);
}

function normalizeStorageKey(value: string) {
  return value.replace(/\\/g, '/').trim();
}

async function readDocumentFields(formData: FormData, path: string) {
  const title = field(formData, 'title');
  const kind = field(formData, 'kind');
  const format = field(formData, 'format');
  const storageKey = normalizeStorageKey(field(formData, 'storageKey'));
  const sortOrder = Number(field(formData, 'sortOrder'));

  if (!title || title.length > 160) validationRedirect(path, 'invalid-title');
  if (!DOCUMENT_KINDS.has(kind)) validationRedirect(path, 'invalid-kind');
  if (!DOCUMENT_FORMATS.has(format)) validationRedirect(path, 'invalid-format');
  if (!storageKey || storageKey.startsWith('/') || storageKey.includes('..') || storageKey.startsWith('../') || storageKey.includes('/../') || storageKey.endsWith('/..')) {
    validationRedirect(path, 'invalid-storage-key');
  }
  if (!Number.isInteger(sortOrder) || sortOrder < 0) validationRedirect(path, 'invalid-sort-order');

  return { title, kind: kind as 'PREPARATORY' | 'PRACTICAL', format: format as 'PDF' | 'HTML', storageKey, sortOrder };
}

function invalidateDocumentViews(courseId: string, documentId?: string) {
  revalidatePath(`${COURSE_PATH}/${encodeURIComponent(courseId)}/edit`);
  if (documentId) {
    revalidatePath(`${COURSE_PATH}/${encodeURIComponent(courseId)}/documents/${encodeURIComponent(documentId)}/edit`);
  }
}

async function getCourse(courseId: string) {
  return prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
}

export async function createCourseDocument(courseId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const path = `${COURSE_PATH}/${encodeURIComponent(courseId)}/documents/new`;
  if (!COURSE_DOCUMENT_ID_RE.test(courseId)) validationRedirect(COURSE_PATH, 'invalid-course-id');
  const course = await getCourse(courseId);
  if (!course) validationRedirect(COURSE_PATH, 'course-not-found');

  const fields = await readDocumentFields(formData, path);
  try {
    const document = await prisma.courseDocument.create({
      data: { courseId, ...fields },
      select: { id: true },
    });
    invalidateDocumentViews(courseId, document.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      validationRedirect(path, 'duplicate-document');
    }
    throw error;
  }

  redirect(`${COURSE_PATH}/${encodeURIComponent(courseId)}/edit?notice=created`);
}

export async function updateCourseDocument(courseId: string, documentId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const path = `${COURSE_PATH}/${encodeURIComponent(courseId)}/documents/${encodeURIComponent(documentId)}/edit`;
  if (!COURSE_DOCUMENT_ID_RE.test(courseId) || !COURSE_DOCUMENT_ID_RE.test(documentId)) {
    validationRedirect(COURSE_PATH, 'invalid-document-id');
  }

  const [course, document] = await Promise.all([
    getCourse(courseId),
    prisma.courseDocument.findUnique({ where: { id: documentId }, select: { id: true, courseId: true } }),
  ]);
  if (!course) validationRedirect(COURSE_PATH, 'course-not-found');
  if (!document || document.courseId !== courseId) validationRedirect(COURSE_PATH, 'document-not-found');

  const fields = await readDocumentFields(formData, path);
  await prisma.courseDocument.update({ where: { id: documentId }, data: fields });
  invalidateDocumentViews(courseId, documentId);
  redirect(`${COURSE_PATH}/${encodeURIComponent(courseId)}/edit?notice=updated`);
}

export async function deleteCourseDocument(courseId: string, documentId: string): Promise<void> {
  await requireAdmin();
  if (!COURSE_DOCUMENT_ID_RE.test(courseId) || !COURSE_DOCUMENT_ID_RE.test(documentId)) {
    validationRedirect(COURSE_PATH, 'invalid-document-id');
  }

  const [course, document] = await Promise.all([
    getCourse(courseId),
    prisma.courseDocument.findUnique({ where: { id: documentId }, select: { id: true, courseId: true } }),
  ]);
  if (!course) validationRedirect(COURSE_PATH, 'course-not-found');
  if (!document || document.courseId !== courseId) validationRedirect(COURSE_PATH, 'document-not-found');

  await prisma.courseDocument.delete({ where: { id: documentId } });
  invalidateDocumentViews(courseId);
  redirect(`${COURSE_PATH}/${encodeURIComponent(courseId)}/edit?notice=deleted`);
}
