import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import AdminConfirmDeleteButton from '@/components/AdminConfirmDeleteButton';
import { deleteCourse } from './actions';

const NOTICES: Record<string, string> = {
  created: 'Le cours a été créé.',
  updated: 'Le cours a été mis à jour.',
  deleted: 'Le cours a été supprimé.',
};

const ERRORS: Record<string, string> = {
  'has-associations': 'Ce cours possède des documents, des défis ou des étapes associés et ne peut pas être supprimé.',
  'not-found': 'Le cours demandé est introuvable.',
  'invalid-id': 'Identifiant de cours invalide.',
};

export default async function AdminCoursesPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const [courses, publishedCourses] = await Promise.all([
    prisma.course.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        level: true,
        position: true,
        published: true,
        category: { select: { code: true, name: true } },
        _count: { select: { documents: true, challenges: true } },
      },
      orderBy: [{ level: 'asc' }, { position: 'asc' }],
    }),
    prisma.course.count({ where: { published: true } }),
  ]);

  return (
    <section className="stack" style={{ gap: 28 }}>
      <div className="section-head">
        <div className="stack" style={{ gap: 8 }}>
          <span className="kicker">ESATIC · CONSOLE</span>
          <h1 className="h1">Cours</h1>
          <p className="lead">{courses.length} cours au total · {publishedCourses} publié{publishedCourses === 1 ? '' : 's'}</p>
        </div>
        <Link href="/admin/courses/new" className="btn btn-primary"><i className="ph ph-plus" aria-hidden="true" />Ajouter un cours</Link>
      </div>

      {query.notice && NOTICES[query.notice] && <div className="row" role="status" style={{ border: '1px solid var(--green)', borderRadius: 8, padding: 12, color: 'var(--green)' }}>{NOTICES[query.notice]}</div>}
      {query.error && <div className="msg-err" role="alert">{ERRORS[query.error] ?? 'Une erreur est survenue.'}</div>}

      {courses.length ? (
        <div className="rows" style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 880 }}>
            <div className="row" style={{ minHeight: 44, gap: 16, padding: '0 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 12 }}>
              <span style={{ flex: 1.5 }}>Cours</span>
              <span style={{ width: 92 }}>Niveau</span>
              <span style={{ width: 78 }}>Position</span>
              <span style={{ width: 120 }}>Catégorie</span>
              <span style={{ width: 96 }}>Statut</span>
              <span style={{ width: 120 }}>Documents</span>
              <span style={{ width: 120 }}>Défis</span>
              <span style={{ width: 200 }}>Actions</span>
            </div>
            {courses.map(course => (
              <div key={course.id} className="row" style={{ minHeight: 95, gap: 16, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ flex: 1.5, minWidth: 160, overflowWrap: 'anywhere' }}>
                  <strong>{course.title}</strong>
                  <span className="faint" style={{ display: 'block', fontSize: 12, marginTop: 4, overflowWrap: 'anywhere' }}>{course.description}</span>
                </span>
                <span className="mono" style={{ width: 92 }}>N{course.level}</span>
                <span className="mono" style={{ width: 78 }}>{course.position}</span>
                <span style={{ width: 120 }}><span className="mono">{course.category.code}</span><span className="faint" style={{ display: 'block', fontSize: 12 }}>{course.category.name}</span></span>
                <span className="pill" style={{ width: 96, justifyContent: 'center', color: course.published ? 'var(--green)' : 'var(--text-3)' }}>{course.published ? 'Publié' : 'Brouillon'}</span>
                <span className="mono" style={{ width: 120 }}>{course._count.documents}</span>
                <span className="mono" style={{ width: 120 }}>{course._count.challenges}</span>
                <span className="row" style={{ width: 200, gap: 8, flexWrap: 'wrap' }}>
                  <Link href={`/admin/courses/${encodeURIComponent(course.id)}/edit`} className="btn btn-outline" style={{ height: 36, padding: '0 12px' }}><i className="ph ph-pencil-simple" aria-hidden="true" />Modifier</Link>
                  <AdminConfirmDeleteButton
                    action={deleteCourse}
                    confirmationMessage={`Supprimer le cours « ${course.title} » ? Cette action est définitive.`}
                    hiddenInput={{ name: 'id', value: course.id }}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty">Aucun cours pour le moment.</div>
      )}
    </section>
  );
}
