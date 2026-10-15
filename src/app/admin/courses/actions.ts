'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

const COURSE_PATH = '/admin/courses';
const COURSE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;
const LEVELS = new Set([1, 2, 3]);

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? '').trim();
}

function validationRedirect(path: string, code: string): never {
  redirect(`${path}?error=${code}`);
}

async function readCourseFields(formData: FormData, path: string) {
  const title = field(formData, 'title');
  const description = field(formData, 'description');
  const categoryCode = field(formData, 'categoryCode');
  const level = Number(field(formData, 'level'));
  const position = Number(field(formData, 'position'));
  const published = formData.get('published') === 'on';

  if (!title) validationRedirect(path, 'invalid-title');
  if (!description) validationRedirect(path, 'invalid-description');
  if (!categoryCode) validationRedirect(path, 'invalid-category');
  if (!Number.isInteger(level) || !LEVELS.has(level)) validationRedirect(path, 'invalid-level');
  if (!Number.isInteger(position) || position <= 0) validationRedirect(path, 'invalid-position');

  const category = await prisma.category.findUnique({ where: { code: categoryCode }, select: { code: true } });
  if (!category) validationRedirect(path, 'invalid-category');

  return { title, description, categoryCode, level, position, published };
}

function invalidateCourseViews(id?: string) {
  revalidatePath(COURSE_PATH);
  revalidatePath('/');
  revalidatePath('/cours');
  if (id) {
    revalidatePath(`/admin/courses/${encodeURIComponent(id)}/edit`);
    revalidatePath(`/cours/${encodeURIComponent(id)}`);
  }
}

export async function createCourse(formData: FormData): Promise<void> {
  await requireAdmin();
  const path = `${COURSE_PATH}/new`;
  const fields = await readCourseFields(formData, path);

  try {
    const course = await prisma.course.create({
      data: { ...fields },
      select: { id: true },
    });
    invalidateCourseViews(course.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      validationRedirect(path, 'duplicate-position');
    }
    throw error;
  }

  redirect(`${COURSE_PATH}?notice=created`);
}

export async function updateCourse(id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const path = `${COURSE_PATH}/${encodeURIComponent(id)}/edit`;
  if (!COURSE_ID_RE.test(id)) validationRedirect(COURSE_PATH, 'invalid-id');

  const existing = await prisma.course.findUnique({ where: { id }, select: { id: true } });
  if (!existing) validationRedirect(COURSE_PATH, 'not-found');

  const fields = await readCourseFields(formData, path);

  try {
    await prisma.course.update({ where: { id }, data: fields });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      validationRedirect(path, 'duplicate-position');
    }
    throw error;
  }

  invalidateCourseViews(id);
  redirect(`${COURSE_PATH}?notice=updated`);
}

export async function deleteCourse(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = field(formData, 'id');
  if (!COURSE_ID_RE.test(id)) validationRedirect(COURSE_PATH, 'invalid-id');

  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true,
      _count: { select: { documents: true, challenges: true, steps: true } },
    },
  });

  if (!course) validationRedirect(COURSE_PATH, 'not-found');
  if (course._count.documents || course._count.challenges || course._count.steps) {
    validationRedirect(COURSE_PATH, 'has-associations');
  }

  await prisma.course.delete({ where: { id } });
  invalidateCourseViews(id);
  redirect(`${COURSE_PATH}?notice=deleted`);
}
