import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import AdminConfirmDeleteButton from '@/components/AdminConfirmDeleteButton';
import { updateCourse } from '../../actions';
import { deleteCourseDocument } from '../../documents/actions';
import { CourseForm } from '../../CourseForm';

export default async function EditAdminCoursePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [course, categories, documents] = await Promise.all([
    prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        categoryCode: true,
        level: true,
        position: true,
        published: true,
        _count: { select: { documents: true, challenges: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.courseDocument.findMany({
      where: { courseId: id },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, title: true, kind: true, format: true, storageKey: true, sortOrder: true },
    }),
  ]);

  if (!course) notFound();

  return (
    <section className="stack" style={{ gap: 32 }}>
      <Link href="/admin/courses" className="back"><i className="ph ph-arrow-left" aria-hidden="true" />Cours</Link>
      <div className="stack" style={{ gap: 8 }}>
        <span className="kicker">MODIFIER · {course.id}</span>
        <h1 className="h1">{course.title}</h1>
      </div>

      <div className="card" style={{ padding: 24, maxWidth: 900 }}>
        <CourseForm
          action={updateCourse.bind(null, course.id)}
          categories={categories}
          course={{
            title: course.title,
            description: course.description,
            categoryCode: course.categoryCode,
            level: course.level,
            position: course.position,
            published: course.published,
          }}
          error={query.error}
          counts={{ documents: course._count.documents, challenges: course._count.challenges }}
        />
      </div>

      <section className="stack" style={{ gap: 18 }}>
        <div className="section-head">
          <div className="stack" style={{ gap: 8 }}>
            <span className="kicker">DOCUMENTS</span>
            <h2 className="h2">Documents du cours</h2>
            <p className="lead">{documents.length} document{documents.length === 1 ? '' : 's'} associé{documents.length === 1 ? '' : 's'}</p>
          </div>
          <Link href={`/admin/courses/${encodeURIComponent(course.id)}/documents/new`} className="btn btn-primary"><i className="ph ph-plus" aria-hidden="true" />Ajouter un document</Link>
        </div>

        <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div className="stack" style={{ gap: 4 }}>
            <span className="kicker">COURSE STEPS</span>
            <h2 className="h2">Éléments pédagogiques</h2>
          </div>
          <Link href={`/admin/courses/${encodeURIComponent(course.id)}/steps`} className="btn btn-outline"><i className="ph ph-gear" aria-hidden="true" />⚙ Gérer les étapes</Link>
        </div>

        {documents.length ? (
          <div className="rows" style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 840 }}>
              <div className="row" style={{ minHeight: 44, gap: 16, padding: '0 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 12 }}>
                <span style={{ flex: 1.4 }}>Titre</span>
                <span style={{ width: 150 }}>Type</span>
                <span style={{ width: 110 }}>Format</span>
                <span style={{ width: 72 }}>Ordre</span>
                <span style={{ flex: 1 }}>StorageKey</span>
                <span style={{ width: 200 }}>Actions</span>
              </div>
              {documents.map(document => (
                <div key={document.id} className="row" style={{ minHeight: 72, gap: 16, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ flex: 1.4, minWidth: 120, overflowWrap: 'anywhere' }}>{document.title}</span>
                  <span style={{ width: 150 }}>{document.kind === 'PREPARATORY' ? 'Préparatoire' : 'Pratique'}</span>
                  <span style={{ width: 110 }}>{document.format === 'PDF' ? 'PDF' : 'HTML'}</span>
                  <span className="mono" style={{ width: 72 }}>{document.sortOrder}</span>
                  <span className="mono faint" style={{ flex: 1, minWidth: 100, overflowWrap: 'anywhere' }}>{document.storageKey}</span>
                  <span className="row" style={{ width: 200, gap: 8, flexWrap: 'wrap' }}>
                    <Link href={`/admin/courses/${encodeURIComponent(course.id)}/documents/${encodeURIComponent(document.id)}/edit`} className="btn btn-outline" style={{ height: 36, padding: '0 12px' }}><i className="ph ph-pencil-simple" aria-hidden="true" />Modifier</Link>
                    <DocumentDeleteButton courseId={course.id} documentId={document.id} title={document.title} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty">Aucun document associé à ce cours.</div>
        )}
      </section>
    </section>
  );
}

function DocumentDeleteButton({ courseId, documentId, title }: { courseId: string; documentId: string; title: string }) {
  return (
    <AdminConfirmDeleteButton
      action={deleteCourseDocument.bind(null, courseId, documentId)}
      confirmationMessage={`Supprimer le document « ${title} » ? Cette action est définitive.`}
    />
  );
}
