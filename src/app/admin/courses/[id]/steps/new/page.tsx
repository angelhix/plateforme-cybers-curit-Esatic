import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { createCourseStep } from '../actions';
import { CourseStepForm } from '../CourseStepForm';

export default async function NewAdminCourseStepPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, title: true },
  });

  if (!course) notFound();

  const challenges = await prisma.challenge.findMany({
    orderBy: { title: 'asc' },
    select: { id: true, title: true, level: true, points: true },
  });

  return (
    <section className="stack" style={{ gap: 24 }}>
      <Link href={`/admin/courses/${encodeURIComponent(id)}/steps`} className="back"><i className="ph ph-arrow-left" aria-hidden="true" />Retour aux étapes</Link>
      <div className="stack" style={{ gap: 8 }}>
        <span className="kicker">NOUVELLE ÉTAPE</span>
        <h1 className="h1">Ajouter une étape</h1>
        <p className="lead">Cours : {course.title}</p>
      </div>
      <div className="card" style={{ padding: 24, maxWidth: 960 }}>
        <CourseStepForm action={createCourseStep.bind(null, course.id)} courseId={course.id} courseTitle={course.title} challenges={challenges} error={query.error} />
      </div>
    </section>
  );
}
