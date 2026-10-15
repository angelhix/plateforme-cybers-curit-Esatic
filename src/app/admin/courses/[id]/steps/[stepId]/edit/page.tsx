import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { updateCourseStep } from '../../actions';
import { CourseStepForm } from '../../CourseStepForm';

export default async function EditAdminCourseStepPage({ params, searchParams }: {
  params: Promise<{ id: string; stepId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const [{ id, stepId }, query] = await Promise.all([params, searchParams]);

  const [course, step, challenges] = await Promise.all([
    prisma.course.findUnique({
      where: { id },
      select: { id: true, title: true },
    }),
    prisma.courseStep.findUnique({
      where: { id: stepId },
      select: {
        id: true,
        courseId: true,
        title: true,
        type: true,
        description: true,
        sortOrder: true,
        articleBody: true,
        challengeId: true,
        questions: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            prompt: true,
            points: true,
            sortOrder: true,
            options: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], select: { id: true, text: true } },
            correctOption: { select: { id: true } },
          },
        },
      },
    }),
    prisma.challenge.findMany({
      orderBy: { title: 'asc' },
      select: { id: true, title: true, level: true, points: true },
    }),
  ]);

  if (!course) notFound();
  if (!step || step.courseId !== id) notFound();
  if (step.challengeId && !challenges.some(challenge => challenge.id === step.challengeId)) notFound();

  const stepForm = {
    title: step.title,
    type: step.type,
    description: step.description,
    sortOrder: step.sortOrder,
    articleBody: step.articleBody ?? '',
    challengeId: step.challengeId,
    questions: step.questions.map(question => ({
      prompt: question.prompt,
      points: question.points,
      sortOrder: question.sortOrder,
      options: question.options.map(option => ({ id: option.id, text: option.text })),
      correctIndex: question.options.findIndex(option => option.id === question.correctOption?.id),
    })),
  };

  return (
    <section className="stack" style={{ gap: 24 }}>
      <Link href={`/admin/courses/${encodeURIComponent(id)}/steps`} className="back"><i className="ph ph-arrow-left" aria-hidden="true" />Retour aux étapes</Link>
      <div className="stack" style={{ gap: 8 }}>
        <span className="kicker">MODIFIER · ÉTAPE</span>
        <h1 className="h1">Modifier l’étape</h1>
        <p className="lead">Cours : {course.title}</p>
      </div>
      <div className="card" style={{ padding: 24, maxWidth: 960 }}>
        <CourseStepForm
          action={updateCourseStep.bind(null, course.id, step.id)}
          courseId={course.id}
          courseTitle={course.title}
          challenges={challenges}
          step={stepForm}
          error={query.error}
        />
      </div>
    </section>
  );
}
