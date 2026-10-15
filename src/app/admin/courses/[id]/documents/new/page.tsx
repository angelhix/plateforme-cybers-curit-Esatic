import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { createCourseDocument } from '../../../documents/actions';
import { DocumentForm } from '../../../documents/DocumentForm';

export default async function NewAdminCourseDocumentPage({ params, searchParams }: {
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

  return (
    <section className="stack" style={{ gap: 24 }}>
      <Link href={`/admin/courses/${encodeURIComponent(id)}/edit`} className="back"><i className="ph ph-arrow-left" aria-hidden="true" />Retour au cours</Link>
      <div className="stack" style={{ gap: 8 }}>
        <span className="kicker">NOUVEAU DOCUMENT</span>
        <h1 className="h1">Ajouter un document</h1>
        <p className="lead">Cours : {course.title}</p>
      </div>
      <div className="card" style={{ padding: 24, maxWidth: 760 }}>
        <DocumentForm action={createCourseDocument.bind(null, course.id)} error={query.error} />
      </div>
    </section>
  );
}
