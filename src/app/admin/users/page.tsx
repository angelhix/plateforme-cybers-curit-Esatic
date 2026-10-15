import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await prisma.user.count();

  return (
    <section className="stack" style={{ gap: 24 }}>
      <div className="section-head">
        <div className="stack" style={{ gap: 8 }}>
          <span className="kicker">ESATIC · CONSOLE</span>
          <h1 className="h1">Utilisateurs</h1>
          <p className="lead">Gestion administrative à venir.</p>
        </div>
        <Link href="/admin" className="btn btn-outline"><i className="ph ph-arrow-left" aria-hidden="true" />Retour au dashboard</Link>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div className="stack" style={{ gap: 12 }}>
          <h2 className="h2">Utilisateurs enregistrés</h2>
          <p className="lead">{users} utilisateur{users === 1 ? '' : 's'} actuellement enregistré{users === 1 ? '' : 's'}.</p>
          <div className="empty" role="status">Le CRUD des utilisateurs n’est pas encore disponible et sera implémenté dans une prochaine étape.</div>
        </div>
      </div>
    </section>
  );
}
