import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

const STATISTICS = [
  { key: 'users', label: 'Utilisateurs', icon: 'ph-users-three', color: 'var(--cyan)' },
  { key: 'challenges', label: 'Défis', icon: 'ph-flag', color: 'var(--gold)' },
  { key: 'publishedChallenges', label: 'Défis publiés', icon: 'ph-broadcast', color: 'var(--green)' },
  { key: 'courses', label: 'Cours', icon: 'ph-books', color: '#8BD3FF' },
  { key: 'publishedCourses', label: 'Cours publiés', icon: 'ph-check-circle', color: 'var(--green)' },
  { key: 'categories', label: 'Catégories', icon: 'ph-squares-four', color: '#E879F9' },
  { key: 'solves', label: 'Résolutions', icon: 'ph-checks', color: 'var(--cyan)' },
  { key: 'flagAttempts', label: 'Tentatives de flag', icon: 'ph-terminal-window', color: 'var(--danger)' },
] as const;

export default async function AdminPage() {
  await requireAdmin();

  let values: Record<(typeof STATISTICS)[number]['key'], number>;
  try {
    const [users, challenges, publishedChallenges, courses, publishedCourses, categories, solves, flagAttempts] = await Promise.all([
      prisma.user.count(),
      prisma.challenge.count(),
      prisma.challenge.count({ where: { published: true } }),
      prisma.course.count(),
      prisma.course.count({ where: { published: true } }),
      prisma.category.count(),
      prisma.solve.count(),
      prisma.flagAttempt.count(),
    ]);
    values = { users, challenges, publishedChallenges, courses, publishedCourses, categories, solves, flagAttempts };
  } catch (error) {
    console.error('Admin dashboard statistics failed to load.', error);
    return (
      <section className="stack" style={{ gap: 16 }}>
        <h1 className="h1">Administration</h1>
        <div className="empty" role="alert">Les statistiques sont momentanément indisponibles.</div>
      </section>
    );
  }

  const quickActions = [
    { href: '/admin/challenges', label: 'Gérer les défis', icon: 'ph-flag', description: 'Consulter et modifier les défis' },
    { href: '/admin/challenges/new', label: 'Ajouter un défi', icon: 'ph-plus', description: 'Créer un nouveau défi' },
    { href: '/admin/courses', label: 'Gérer les cours', icon: 'ph-books', description: 'Consulter la gestion des cours' },
    { href: '/admin/courses/new', label: 'Ajouter un cours', icon: 'ph-plus-circle', description: 'Créer un nouveau cours' },
    { href: '/admin/users', label: 'Gérer les utilisateurs', icon: 'ph-users-three', description: 'Gérer les comptes administrateur et joueurs' },
  ] as const;

  return (
    <section className="stack" style={{ gap: 32 }}>
      <div className="stack" style={{ gap: 8 }}>
        <span className="kicker">ESATIC · CONSOLE</span>
        <h1 className="h1">Administration</h1>
        <p className="lead">Vue d’ensemble de la plateforme</p>
      </div>

      <section className="stack" style={{ gap: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
          <h2 className="h2">Accès rapide</h2>
          <span className="muted" style={{ fontSize: 13 }}>Toutes les sections sont protégées par une vérification ADMIN</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
          {quickActions.map(action => (
            <a key={action.href} href={action.href} className="card lift" style={{ minHeight: 114, padding: 18, gap: 10 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <i className={`ph ${action.icon}`} aria-hidden="true" style={{ color: 'var(--cyan)', fontSize: 24 }} />
                <i className="ph ph-arrow-right" aria-hidden="true" style={{ color: 'var(--text-3)' }} />
              </div>
              <strong style={{ fontSize: 17 }}>{action.label}</strong>
              <span className="muted" style={{ fontSize: 13 }}>{action.description}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="stack" style={{ gap: 14 }}>
        <h2 className="h2">Statistiques</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
          {STATISTICS.map(stat => (
            <section key={stat.key} className="card" style={{ minHeight: 132, padding: 18, gap: 18 }}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
                <span className="muted" style={{ fontSize: 14 }}>{stat.label}</span>
                <i className={`ph ${stat.icon}`} aria-hidden="true" style={{ color: stat.color, fontSize: 21 }} />
              </div>
              <strong className="mono" style={{ fontSize: 30, lineHeight: 1 }}>{values[stat.key].toLocaleString('fr-FR')}</strong>
            </section>
          ))}
        </div>
      </section>
    </section>
  );
}
