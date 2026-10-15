import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { createChallenge } from '../actions';
import { ChallengeForm } from '../ChallengeForm';

export default async function NewAdminChallengePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const [categories, courses, query] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.course.findMany({ select: { id: true, title: true, level: true }, orderBy: [{ level: 'asc' }, { position: 'asc' }] }),
    searchParams,
  ]);

  return (
    <section className="stack" style={{ gap: 24 }}>
      <Link href="/admin/challenges" className="back"><i className="ph ph-arrow-left" aria-hidden="true" />Défis</Link>
      <div className="stack" style={{ gap: 8 }}>
        <span className="kicker">NOUVEAU CONTENU</span>
        <h1 className="h1">Créer un défi</h1>
      </div>
      <div className="card" style={{ padding: 24, maxWidth: 880 }}>
        <ChallengeForm action={createChallenge} categories={categories} courses={courses} error={query.error} />
      </div>
    </section>
  );
}