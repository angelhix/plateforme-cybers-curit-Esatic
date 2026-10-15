import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { createCourse } from '../actions';
import { CourseForm } from '../CourseForm';

export default async function NewAdminCoursePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const [categories, query] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    searchParams,
  ]);

  return (
    <section className="stack" style={{ gap: 24 }}>
      <Link href="/admin/courses" className="back"><i className="ph ph-arrow-left" aria-hidden="true" />Cours</Link>
      <div className="stack" style={{ gap: 8 }}>
        <span className="kicker">NOUVEAU CONTENU</span>
        <h1 className="h1">Ajouter un cours</h1>
      </div>
      <div className="card" style={{ padding: 24, maxWidth: 900 }}>
        <CourseForm action={createCourse} categories={categories} error={query.error} />
      </div>
    </section>
  );
}
