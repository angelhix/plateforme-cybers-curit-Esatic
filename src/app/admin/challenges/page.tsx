import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import AdminChallengeDeleteButton from '@/components/AdminChallengeDeleteButton';

const NOTICES: Record<string, string> = {
  created: 'Le défi a été créé.',
  updated: 'Le défi a été mis à jour.',
  deleted: 'Le défi a été supprimé.',
};

const ERRORS: Record<string, string> = {
  'has-progress': 'Ce défi possède des résolutions ou tentatives et ne peut pas être supprimé.',
  'has-associations': 'Ce défi est associé à une étape de cours et ne peut pas être supprimé.',
  'not-found': 'Le défi demandé est introuvable.',
  'invalid-id': 'Identifiant de défi invalide.',
};

export default async function AdminChallengesPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const challenges = await prisma.challenge.findMany({
    select: {
      id: true,
      title: true,
      categoryCode: true,
      level: true,
      points: true,
      published: true,
      category: { select: { name: true } },
      course: { select: { title: true } },
      _count: { select: { solves: true, attempts: true } },
    },
    orderBy: [{ id: 'asc' }],
  });

  return (
    <section className="stack" style={{ gap: 28 }}>
      <div className="section-head">
        <div className="stack" style={{ gap: 8 }}>
          <span className="kicker">ESATIC · CONSOLE</span>
          <h1 className="h1">Défis</h1>
          <p className="lead">{challenges.length} défi{challenges.length === 1 ? '' : 's'} au total</p>
        </div>
        <Link href="/admin/challenges/new" className="btn btn-primary"><i className="ph ph-plus" aria-hidden="true" />Nouveau défi</Link>
      </div>

      {query.notice && NOTICES[query.notice] && <div className="row" role="status" style={{ border: '1px solid var(--green)', borderRadius: 8, padding: 12, color: 'var(--green)' }}>{NOTICES[query.notice]}</div>}
      {query.error && <div className="msg-err" role="alert">{ERRORS[query.error] ?? 'Une erreur est survenue.'}</div>}

      {challenges.length ? (
        <div className="rows" style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 820 }}>
            <div className="row" style={{ minHeight: 44, gap: 16, padding: '0 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 12 }}>
              <span style={{ width: 100 }}>ID</span><span style={{ flex: 1 }}>Défi</span><span style={{ width: 160 }}>Catégorie</span><span style={{ width: 64 }}>Niveau</span><span style={{ width: 74 }}>Points</span><span style={{ width: 150 }}>Cours</span><span style={{ width: 105 }}>Statut</span><span style={{ width: 230 }}>Actions</span>
            </div>
            {challenges.map(challenge => (
              <div key={challenge.id} className="row" style={{ minHeight: 68, gap: 16, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                <span className="mono faint" style={{ width: 100, fontSize: 12 }}>{challenge.id}</span>
                <span style={{ flex: 1, minWidth: 120, fontWeight: 600, overflowWrap: 'anywhere' }}>{challenge.title}</span>
                <span style={{ width: 160, minWidth: 0 }}><span className="mono">{challenge.categoryCode}</span><span className="faint" style={{ display: 'block', fontSize: 12, overflowWrap: 'anywhere' }}>{challenge.category.name}</span></span>
                <span className="mono" style={{ width: 64 }}>N{challenge.level}</span>
                <span className="mono" style={{ width: 74, color: 'var(--gold)' }}>{challenge.points}</span>
                <span className="muted" style={{ width: 150, overflowWrap: 'anywhere' }}>{challenge.course?.title ?? '—'}</span>
                <span className="pill" style={{ width: 105, justifyContent: 'center', color: challenge.published ? 'var(--green)' : 'var(--text-3)' }}>{challenge.published ? 'Publié' : 'Brouillon'}</span>
                <span className="row" style={{ width: 230, gap: 8, flexWrap: 'wrap' }}>
                  <Link href={`/admin/challenges/${encodeURIComponent(challenge.id)}/edit`} className="btn btn-outline" style={{ height: 36, padding: '0 12px' }}><i className="ph ph-pencil-simple" aria-hidden="true" />Modifier</Link>
                  <AdminChallengeDeleteButton id={challenge.id} title={challenge.title} />
                  <span className="faint" title="Résolutions / tentatives" style={{ fontSize: 11 }}>{challenge._count.solves}/{challenge._count.attempts}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty">Aucun défi pour le moment.</div>
      )}
    </section>
  );
}