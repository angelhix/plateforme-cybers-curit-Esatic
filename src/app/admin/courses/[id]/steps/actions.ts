'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

const COURSE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;
const STEP_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;
const COURSE_STEP_PATH = '/admin/courses';

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? '').trim();
}

function validationRedirect(path: string, code: string): never {
  redirect(`${path}?error=${code}`);
}

type QuestionPayload = {
  prompt: string;
  points: number;
  sortOrder: number;
  options: Array<{ text: string; sortOrder: number }>;
  correctOptionIndex: number;
};

function parseInteger(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function getQuestionEntries(formData: FormData) {
  const entries = [...formData.entries()].filter(([key]) => key.startsWith('question-'));
  const questionIndexSet = new Set<number>();
  const questions = new Map<number, QuestionPayload>();

  for (const [key, value] of entries) {
    const match = key.match(/^question-(\d+)-(prompt|points|sortOrder|option-(\d+)|correct)$/);
    if (!match) continue;
    const [, rawIndex, fieldName, rawOptionIndex] = match;
    const index = Number(rawIndex);
    if (!Number.isInteger(index)) continue;
    questionIndexSet.add(index);

    const question = questions.get(index) ?? {
      prompt: '',
      points: 1,
      sortOrder: index,
      options: [],
      correctOptionIndex: -1,
    };

    if (fieldName === 'prompt') question.prompt = String(value).trim();
    if (fieldName === 'points') {
      const points = parseInteger(String(value));
      question.points = points ?? 1;
    }
    if (fieldName === 'sortOrder') {
      const sortOrder = parseInteger(String(value));
      question.sortOrder = sortOrder ?? index;
    }
    if (fieldName === 'correct') question.correctOptionIndex = Number(value);
    if (fieldName.startsWith('option-')) {
      const optionIndex = Number(rawOptionIndex);
      const option = question.options.find(item => item.sortOrder === optionIndex) ?? {
        text: '',
        sortOrder: optionIndex,
      };
      option.text = String(value).trim();
      if (!question.options.some(item => item.sortOrder === optionIndex)) {
        question.options.push(option);
      }
    }
    questions.set(index, question);
  }

  return [...questionIndexSet]
    .sort((left, right) => left - right)
    .map(index => questions.get(index)!)
    .filter(question => question.prompt || question.options.length || question.correctOptionIndex >= 0);
}

function invalidateStepViews(courseId: string, stepId?: string) {
  revalidatePath(`${COURSE_STEP_PATH}/${encodeURIComponent(courseId)}/steps`);
  if (stepId) {
    revalidatePath(`${COURSE_STEP_PATH}/${encodeURIComponent(courseId)}/steps/${encodeURIComponent(stepId)}/edit`);
  }
}

async function getCourse(courseId: string) {
  return prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true },
  });
}

async function getCourseStep(stepId: string, courseId: string) {
  return prisma.courseStep.findUnique({
    where: { id: stepId },
    select: { id: true, courseId: true },
  });
}

async function assertChallengeAvailable(courseId: string, challengeId: string, stepId?: string) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true, courseStep: { select: { id: true } } },
  });

  if (!challenge) validationRedirect(`${COURSE_STEP_PATH}/${encodeURIComponent(courseId)}/steps/new`, 'invalid-challenge');
  if (challenge.courseStep && challenge.courseStep.id !== stepId) {
    validationRedirect(`${COURSE_STEP_PATH}/${encodeURIComponent(courseId)}/steps/${encodeURIComponent(stepId ?? 'new')}/edit`, 'challenge-in-use');
  }
}

async function validateQuizQuestions(courseId: string, questions: QuestionPayload[], path: string) {
  if (!questions.length) validationRedirect(path, 'invalid-quiz');

  for (const [index, question] of questions.entries()) {
    if (!question.prompt) validationRedirect(path, 'invalid-question-prompt');
    if (question.options.length < 2) validationRedirect(path, 'invalid-question-options');
    if (!Number.isInteger(question.points) || question.points < 1) validationRedirect(path, 'invalid-question-points');
    if (!Number.isInteger(question.sortOrder) || question.sortOrder < 0) validationRedirect(path, 'invalid-question-sort-order');
    if (question.correctOptionIndex < 0 || question.correctOptionIndex >= question.options.length) {
      validationRedirect(path, 'invalid-question-answer');
    }
    if (question.options.some((option, optionIndex) => (!option.text || optionIndex === question.correctOptionIndex && !option.text.trim()))) {
      validationRedirect(path, 'invalid-question-options');
    }
    if (new Set(question.options.map(option => option.text)).size !== question.options.length) {
      validationRedirect(path, 'duplicate-question-option');
    }
    if (question.options.length === 2 && question.options.every(option => option.text.trim() === '')) {
      validationRedirect(path, 'invalid-question-options');
    }
    if (index === questions.length - 1) continue;
  }
}

async function createQuizStep(courseId: string, stepId: string, questions: QuestionPayload[], tx: Prisma.TransactionClient) {
  const createdQuestions = [] as Array<{ id: string; correctOptionId: string }>;

  for (const question of questions) {
    const createdQuestion = await tx.courseStepQuizQuestion.create({
      data: {
        stepId,
        prompt: question.prompt,
        points: question.points,
        sortOrder: question.sortOrder,
      },
      select: { id: true },
    });

    const createdOptions = await Promise.all(question.options.map(async (option, optionIndex) => tx.courseStepQuizOption.create({
      data: {
        questionId: createdQuestion.id,
        text: option.text,
        sortOrder: option.sortOrder,
      },
      select: { id: true },
    })));

    const correctOption = createdOptions[question.correctOptionIndex];
    if (!correctOption) validationRedirect(`${COURSE_STEP_PATH}/${encodeURIComponent(courseId)}/steps/new`, 'invalid-question-answer');
    createdQuestions.push({ id: createdQuestion.id, correctOptionId: correctOption.id });
  }

  await Promise.all(createdQuestions.map(question => tx.courseStepQuizQuestion.update({
    where: { id: question.id },
    data: { correctOptionId: question.correctOptionId },
  })));
}

async function replaceQuizStep(courseId: string, stepId: string, questions: QuestionPayload[], tx: Prisma.TransactionClient) {
  await tx.courseStepQuizOption.deleteMany({ where: { question: { stepId } } });
  await tx.courseStepQuizQuestion.deleteMany({ where: { stepId } });
  await createQuizStep(courseId, stepId, questions, tx);
}

export async function createCourseStep(courseId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const path = `${COURSE_STEP_PATH}/${encodeURIComponent(courseId)}/steps/new`;
  if (!COURSE_ID_RE.test(courseId)) validationRedirect(COURSE_STEP_PATH, 'invalid-course-id');

  const course = await getCourse(courseId);
  if (!course) validationRedirect(COURSE_STEP_PATH, 'course-not-found');

  const type = field(formData, 'type');
  const title = field(formData, 'title');
  const description = field(formData, 'description');
  const sortOrder = parseInteger(field(formData, 'sortOrder'));
  const articleBody = field(formData, 'articleBody');
  const challengeId = field(formData, 'challengeId') || null;
  const questions = getQuestionEntries(formData);

  if (!title) validationRedirect(path, 'invalid-title');
  if (!['ARTICLE', 'QUIZ', 'CHALLENGE'].includes(type)) validationRedirect(path, 'invalid-type');
  if (sortOrder === null || !Number.isInteger(sortOrder) || sortOrder < 0) validationRedirect(path, 'invalid-sort-order');
  if (type === 'ARTICLE' && !articleBody) validationRedirect(path, 'invalid-article-body');
  if (type === 'CHALLENGE' && !challengeId) validationRedirect(path, 'invalid-challenge');
  if (type === 'QUIZ') await validateQuizQuestions(courseId, questions, path);

  if (type === 'CHALLENGE' && challengeId) {
    await assertChallengeAvailable(courseId, challengeId);
  }

  try {
    const step = await prisma.$transaction(async tx => {
      const created = await tx.courseStep.create({
        data: {
          courseId,
          type: type as 'ARTICLE' | 'QUIZ' | 'CHALLENGE',
          title,
          description,
          sortOrder,
          articleBody: type === 'ARTICLE' ? articleBody : null,
          challengeId: type === 'CHALLENGE' ? challengeId : null,
        },
        select: { id: true },
      });

      if (type === 'QUIZ') {
        await createQuizStep(courseId, created.id, questions, tx);
      }
      return created;
    });

    invalidateStepViews(courseId, step.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      validationRedirect(path, 'duplicate-sort-order');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      validationRedirect(path, 'invalid-challenge');
    }
    throw error;
  }

  redirect(`${COURSE_STEP_PATH}/${encodeURIComponent(courseId)}/steps?notice=created`);
}

export async function updateCourseStep(courseId: string, stepId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const path = `${COURSE_STEP_PATH}/${encodeURIComponent(courseId)}/steps/${encodeURIComponent(stepId)}/edit`;
  if (!COURSE_ID_RE.test(courseId) || !STEP_ID_RE.test(stepId)) validationRedirect(COURSE_STEP_PATH, 'invalid-step-id');

  const existingStep = await getCourseStep(stepId, courseId);
  if (!existingStep || existingStep.courseId !== courseId) validationRedirect(COURSE_STEP_PATH, 'step-not-found');

  const course = await getCourse(courseId);
  if (!course) validationRedirect(COURSE_STEP_PATH, 'course-not-found');

  const type = field(formData, 'type');
  const title = field(formData, 'title');
  const description = field(formData, 'description');
  const sortOrder = parseInteger(field(formData, 'sortOrder'));
  const articleBody = field(formData, 'articleBody');
  const challengeId = field(formData, 'challengeId') || null;
  const questions = getQuestionEntries(formData);

  if (!title) validationRedirect(path, 'invalid-title');
  if (!['ARTICLE', 'QUIZ', 'CHALLENGE'].includes(type)) validationRedirect(path, 'invalid-type');
  if (sortOrder === null || !Number.isInteger(sortOrder) || sortOrder < 0) validationRedirect(path, 'invalid-sort-order');
  if (type === 'ARTICLE' && !articleBody) validationRedirect(path, 'invalid-article-body');
  if (type === 'CHALLENGE' && !challengeId) validationRedirect(path, 'invalid-challenge');
  if (type === 'QUIZ') await validateQuizQuestions(courseId, questions, path);

  if (type === 'CHALLENGE' && challengeId) {
    await assertChallengeAvailable(courseId, challengeId, stepId);
  }

  try {
    await prisma.$transaction(async tx => {
      const data = {
        type: type as 'ARTICLE' | 'QUIZ' | 'CHALLENGE',
        title,
        description,
        sortOrder,
        articleBody: type === 'ARTICLE' ? articleBody : null,
        challengeId: type === 'CHALLENGE' ? challengeId : null,
      };

      await tx.courseStep.update({
        where: { id: stepId },
        data,
      });

      if (type === 'QUIZ') {
        await replaceQuizStep(courseId, stepId, questions, tx);
      } else {
        await tx.courseStepQuizOption.deleteMany({ where: { question: { stepId } } });
        await tx.courseStepQuizQuestion.deleteMany({ where: { stepId } });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      validationRedirect(path, 'duplicate-sort-order');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      validationRedirect(path, 'invalid-challenge');
    }
    throw error;
  }

  invalidateStepViews(courseId, stepId);
  redirect(`${COURSE_STEP_PATH}/${encodeURIComponent(courseId)}/steps?notice=updated`);
}

export async function deleteCourseStep(courseId: string, stepId: string): Promise<void> {
  await requireAdmin();
  const path = `${COURSE_STEP_PATH}/${encodeURIComponent(courseId)}/steps`;
  if (!COURSE_ID_RE.test(courseId) || !STEP_ID_RE.test(stepId)) validationRedirect(path, 'invalid-step-id');

  const step = await getCourseStep(stepId, courseId);
  if (!step || step.courseId !== courseId) validationRedirect(path, 'step-not-found');

  await prisma.$transaction(async tx => {
    await tx.courseStepProgress.deleteMany({ where: { stepId } });
    await tx.courseStepQuizOption.deleteMany({ where: { question: { stepId } } });
    await tx.courseStepQuizQuestion.deleteMany({ where: { stepId } });
    await tx.courseStep.delete({ where: { id: stepId } });
  });

  invalidateStepViews(courseId);
  redirect(`${COURSE_STEP_PATH}/${encodeURIComponent(courseId)}/steps?notice=deleted`);
}
