'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

async function publishedStep(courseId: string, stepId: string) {
  return prisma.courseStep.findFirst({
    where: { id: stepId, courseId, course: { published: true } },
    select: { id: true, type: true, sortOrder: true, course: { select: { level: true, position: true } } },
  });
}

async function completeStep(userId: number, stepId: string) {
  await prisma.courseStepProgress.upsert({
    where: { userId_stepId: { userId, stepId } },
    create: { userId, stepId, completedAt: new Date() },
    update: { completedAt: new Date() },
  });
}

function coursePath(level: number, position: number, result?: string) {
  const path = `/cours/${level}/${String(position).padStart(2, '0')}`;
  return result ? `${path}?${new URLSearchParams({ result })}` : path;
}

export async function completeArticleStep(courseId: string, stepId: string): Promise<void> {
  const step = await publishedStep(courseId, stepId);
  if (!step || step.type !== 'ARTICLE') redirect('/cours');
  const path = coursePath(step.course.level, step.course.position);
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?${new URLSearchParams({ next: path })}`);

  await completeStep(user.id, step.id);
  revalidatePath(path);
  redirect(path);
}

export async function submitCourseQuiz(courseId: string, stepId: string, formData: FormData): Promise<void> {
  const step = await publishedStep(courseId, stepId);
  if (!step || step.type !== 'QUIZ') redirect('/cours');
  const path = coursePath(step.course.level, step.course.position);
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?${new URLSearchParams({ next: path })}`);

  const questions = await prisma.courseStepQuizQuestion.findMany({
    where: { stepId },
    select: {
      id: true,
      correctOptionId: true,
      options: { select: { id: true } },
    },
  });
  const correct = questions.length > 0 && questions.every(question => {
    const selected = String(formData.get(`answer-${question.id}`) ?? '');
    return question.correctOptionId !== null
      && question.options.some(option => option.id === selected)
      && selected === question.correctOptionId;
  });

  if (correct) await completeStep(user.id, step.id);
  const pagePath = coursePath(step.course.level, step.course.position);
  const resultPath = coursePath(step.course.level, step.course.position, correct ? 'quiz-correct' : 'quiz-incorrect');
  revalidatePath(pagePath);
  redirect(resultPath);
}