'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { hashFlag, normalizeFlag } from '@/lib/crypto';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

const CHALLENGE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;
const CHALLENGE_PATH = '/admin/challenges';

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? '').trim();
}

function validationRedirect(path: string, code: string): never {
  redirect(`${path}?error=${code}`);
}

async function readChallengeFields(formData: FormData, path: string) {
  const id = field(formData, 'id');
  const title = field(formData, 'title');
  const categoryCode = field(formData, 'categoryCode');
  const level = Number(field(formData, 'level'));
  const points = Number(field(formData, 'points'));
  const description = field(formData, 'description');
  const goal = field(formData, 'goal');
  const command = field(formData, 'command');
  const output = field(formData, 'output');
  const courseId = field(formData, 'courseId') || null;
  const published = formData.get('published') === 'on';

  if (!CHALLENGE_ID_RE.test(id)) validationRedirect(path, 'invalid-id');
  if (!title || !categoryCode || ![1, 2, 3].includes(level) || !Number.isInteger(points) || points <= 0) {
    validationRedirect(path, 'invalid-fields');
  }
  if (!description || !goal || !command || !output) validationRedirect(path, 'required-fields');

  const category = await prisma.category.findUnique({ where: { code: categoryCode }, select: { code: true } });
  if (!category) validationRedirect(path, 'invalid-category');
  if (courseId) {
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) validationRedirect(path, 'invalid-course');
  }

  return { id, title, categoryCode, level, points, description, goal, command, output, courseId, published };
}

function invalidateChallengeViews(id: string) {
  revalidatePath('/admin/challenges');
  revalidatePath(`/admin/challenges/${encodeURIComponent(id)}/edit`);
  revalidatePath('/defis');
  revalidatePath(`/defis/${encodeURIComponent(id)}`);
  revalidatePath('/classement');
  revalidatePath('/');
}

export async function createChallenge(formData: FormData): Promise<void> {
  await requireAdmin();
  const path = `${CHALLENGE_PATH}/new`;
  const fields = await readChallengeFields(formData, path);
  const flag = normalizeFlag(field(formData, 'flag'));
  if (!flag || flag.length > 200) validationRedirect(path, 'invalid-flag');

  try {
    await prisma.challenge.create({
      data: {
        ...fields,
        flagHash: hashFlag(flag),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      validationRedirect(path, 'duplicate-id');
    }
    throw error;
  }

  invalidateChallengeViews(fields.id);
  redirect(`${CHALLENGE_PATH}?notice=created`);
}

export async function updateChallenge(id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const path = `${CHALLENGE_PATH}/${encodeURIComponent(id)}/edit`;
  const fields = await readChallengeFields(formData, path);
  if (fields.id !== id) validationRedirect(path, 'immutable-id');

  const existing = await prisma.challenge.findUnique({ where: { id }, select: { id: true, flagHash: true } });
  if (!existing) validationRedirect(CHALLENGE_PATH, 'not-found');

  const rawFlag = field(formData, 'flag');
  const data = {
    title: fields.title,
    categoryCode: fields.categoryCode,
    level: fields.level,
    points: fields.points,
    description: fields.description,
    goal: fields.goal,
    command: fields.command,
    output: fields.output,
    courseId: fields.courseId,
    published: fields.published,
    ...(rawFlag ? { flagHash: hashFlag(normalizeFlag(rawFlag)) } : {}),
  };
  if (rawFlag && (!normalizeFlag(rawFlag) || normalizeFlag(rawFlag).length > 200)) {
    validationRedirect(path, 'invalid-flag');
  }

  await prisma.challenge.update({ where: { id }, data });
  invalidateChallengeViews(id);
  redirect(`${CHALLENGE_PATH}?notice=updated`);
}

export async function deleteChallenge(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = field(formData, 'id');
  if (!CHALLENGE_ID_RE.test(id)) validationRedirect(CHALLENGE_PATH, 'invalid-id');

  const result = await prisma.$transaction(async tx => {
    const [solves, attempts, courseSteps] = await Promise.all([
      tx.solve.count({ where: { challengeId: id } }),
      tx.flagAttempt.count({ where: { challengeId: id } }),
      tx.courseStep.count({ where: { challengeId: id } }),
    ]);
    if (solves || attempts) return 'has-progress' as const;
    if (courseSteps) return 'has-associations' as const;
    const deleted = await tx.challenge.deleteMany({ where: { id } });
    return deleted.count ? 'deleted' as const : 'not-found' as const;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (result !== 'deleted') validationRedirect(CHALLENGE_PATH, result);
  invalidateChallengeViews(id);
  redirect(`${CHALLENGE_PATH}?notice=deleted`);
}