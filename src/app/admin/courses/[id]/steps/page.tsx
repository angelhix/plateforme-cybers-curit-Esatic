import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import AdminConfirmDeleteButton from '@/components/AdminConfirmDeleteButton';
import { deleteCourseStep } from './actions';

const NOTICES: Record<string, string> = {
  created: 'L’étape a été créée.',
  updated: 'L’étape a été mise à jour.',
  deleted: 'L’étape a été supprimée.',
};

const ERRORS: Record<string, string> = {
  'course-not-found': 'Le cours demandé est introuvable.',
  'invalid-course-id': 'Identifiant de cours invalide.',
  'invalid-step-id': 'Identifiant d’étape invalide.',
  'step-not-found': 'L’étape demandée est introuvable.',
};

export default async function AdminCourseStepsPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      level: true,
      published: true,
      category: { select: { code: true, name: true } },
      _count: { select: { steps: true } },
    },
  });

  if (!course) notFound();

  const steps = await prisma.courseStep.findMany({
    where: { courseId: id },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      title: true,
      type: true,
      description: true,
      sortOrder: true,
      articleBody: true,
      challenge: { select: { id: true, title: true, level: true, points: true } },
      _count: { select: { questions: true, progress: true } },
    },
  });

  return (
    <section className="stack" style={{ gap: 28 }}>
      <Link href={`/admin/courses/${encodeURIComponent(id)}/edit`} className="back"><i className="ph ph-arrow-left" aria-hidden="true" />Retour au cours</Link>

      <div className="section-head">
        <div className="stack" style={{ gap: 8 }}>
          <span className="kicker">ESATIC · CONSOLE</span>
          <h1 className="h1">Étapes · {course.title}</h1>
          <p className="lead">Niveau {course.level} · {course.category.code} · {course.published ? 'Publié' : 'Brouillon'} · {course._count.steps} étape{course._count.steps === 1 ? '' : 's'}</p>
        </div>
        <Link href={`/admin/courses/${encodeURIComponent(id)}/steps/new`} className="btn btn-primary"><i className="ph ph-plus" aria-hidden="true" />Ajouter une étape</Link>
      </div>

      {query.notice && NOTICES[query.notice] && <div className="row" role="status" style={{ border: '1px solid var(--green)', borderRadius: 8, padding: 12, color: 'var(--green)' }}>{NOTICES[query.notice]}</div>}
      {query.error && <div className="msg-err" role="alert">{ERRORS[query.error] ?? 'Une erreur est survenue.'}</div>}

      {steps.length ? (
        <div className="rows" style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 920 }}>
            <div className="row" style={{ minHeight: 44, gap: 16, padding: '0 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 12 }}>
              <span style={{ width: 68 }}>Position</span>
              <span style={{ flex: 1.2 }}>Étape</span>
              <span style={{ width: 120 }}>Type</span>
              <span style={{ width: 220 }}>Informations</span>
              <span style={{ width: 200 }}>Actions</span>
            </div>
            {steps.map(step => (
              <div key={step.id} className="row" style={{ minHeight: 84, gap: 16, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <span className="mono" style={{ width: 68 }}>{step.sortOrder}</span>
                <span style={{ flex: 1.2, minWidth: 180, overflowWrap: 'anywhere' }}>
                  <strong>{step.title}</strong>
                  <span className="faint" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>{step.description || 'Aucune description.'}</span>
                </span>
                <span className="pill" style={{ width: 120, justifyContent: 'center' }}>{step.type}</span>
                <span style={{ width: 220, overflowWrap: 'anywhere', color: 'var(--text-2)', fontSize: 13 }}>
                  {step.type === 'ARTICLE' && step.articleBody && <><strong>{step.articleBody.length}</strong> caractères</>}
                  {step.type === 'QUIZ' && <><strong>{step._count.questions}</strong> question{step._count.questions === 1 ? '' : 's'} · <strong>{step._count.progress}</strong> progression{step._count.progress === 1 ? '' : 's'}</>}
                  {step.type === 'CHALLENGE' && step.challenge && <><strong>{step.challenge.title}</strong> · N{step.challenge.level} · {step.challenge.points} pts</>}
                  {step.type === 'CHALLENGE' && !step.challenge && 'Aucun défi associé'}
                </span>
                <span className="row" style={{ width: 200, gap: 8, flexWrap: 'wrap' }}>
                  <Link href={`/admin/courses/${encodeURIComponent(id)}/steps/${encodeURIComponent(step.id)}/edit`} className="btn btn-outline" style={{ height: 36, padding: '0 12px' }}><i className="ph ph-pencil-simple" aria-hidden="true" />Modifier</Link>
                  <StepDeleteButton courseId={id} stepId={step.id} title={step.title} />
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty">Aucune étape associée à ce cours.</div>
      )}
    </section>
  );
}

function StepDeleteButton({ courseId, stepId, title }: { courseId: string; stepId: string; title: string }) {
  return (
    <AdminConfirmDeleteButton
      action={deleteCourseStep.bind(null, courseId, stepId)}
      confirmationMessage={`Supprimer l’étape « ${title} » ? Cette action est définitive.`}
    />
  );
}
