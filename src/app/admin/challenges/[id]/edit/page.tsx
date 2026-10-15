import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { updateChallenge } from '../../actions';
import { ChallengeForm } from '../../ChallengeForm';

export default async function EditAdminChallengePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [challenge, categories, courses] = await Promise.all([
    prisma.challenge.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        categoryCode: true,
        level: true,
        points: true,
        description: true,
        goal: true,
        command: true,
        output: true,
        published: true,
        courseId: true,
      },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.course.findMany({ select: { id: true, title: true, level: true }, orderBy: [{ level: 'asc' }, { position: 'asc' }] }),
  ]);
  if (!challenge) notFound();

  return (
    <section className="stack" style={{ gap: 24 }}>
      <Link href="/admin/challenges" className="back"><i className="ph ph-arrow-left" aria-hidden="true" />Défis</Link>
      <div className="stack" style={{ gap: 8 }}>
        <span className="kicker">MODIFIER · {challenge.id}</span>
        <h1 className="h1">{challenge.title}</h1>
      </div>
      <div className="card" style={{ padding: 24, maxWidth: 880 }}>
        <ChallengeForm action={updateChallenge.bind(null, challenge.id)} categories={categories} courses={courses} challenge={challenge} error={query.error} />
      </div>
    </section>
  );
}