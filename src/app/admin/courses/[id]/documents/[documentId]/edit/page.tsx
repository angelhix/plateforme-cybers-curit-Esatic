import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { updateCourseDocument } from '../../../../documents/actions';
import { DocumentForm } from '../../../../documents/DocumentForm';

export default async function EditAdminCourseDocumentPage({ params, searchParams }: {
  params: Promise<{ id: string; documentId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const [{ id, documentId }, query] = await Promise.all([params, searchParams]);
  const [course, document] = await Promise.all([
    prisma.course.findUnique({ where: { id }, select: { id: true, title: true } }),
    prisma.courseDocument.findUnique({ where: { id: documentId }, select: { id: true, title: true, kind: true, format: true, storageKey: true, sortOrder: true, courseId: true } }),
  ]);

  if (!course || !document || document.courseId !== course.id) notFound();

  return (
    <section className="stack" style={{ gap: 24 }}>
      <Link href={`/admin/courses/${encodeURIComponent(id)}/edit`} className="back"><i className="ph ph-arrow-left" aria-hidden="true" />Retour au cours</Link>
      <div className="stack" style={{ gap: 8 }}>
        <span className="kicker">MODIFIER · {document.id}</span>
        <h1 className="h1">{document.title}</h1>
        <p className="lead">Cours : {course.title}</p>
      </div>
      <div className="card" style={{ padding: 24, maxWidth: 760 }}>
        <DocumentForm
          action={updateCourseDocument.bind(null, course.id, document.id)}
          document={{
            title: document.title,
            kind: document.kind,
            format: document.format,
            storageKey: document.storageKey,
            sortOrder: document.sortOrder,
          }}
          error={query.error}
        />
      </div>
    </section>
  );
}
