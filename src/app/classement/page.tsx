import Link from 'next/link';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { leaderboard } from '@/lib/data';

export const metadata: Metadata = { title: 'Classement · Plateforme CTF ESATIC' };

export default async function BoardPage() {
  const me = await getCurrentUser();
  const board = await leaderboard();
  // Podium : 2ᵉ à gauche, 1ᵉʳ au centre, 3ᵉ à droite.
  const podium = [board[1], board[0], board[2]].filter(Boolean);
  const rest = board.slice(3);
  const name = (h: string) => (me?.handle === h ? `${h} (toi)` : h);

  return (
    <section className="stack" style={{ gap: 32 }}>
      <h1 className="h1">Classement</h1>
      {board.length === 0 && <div className="empty">$ cat scores.txt → personne pour l’instant.</div>}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
        {podium.map(r => (
          <Link key={r.id} href={`/profil/${r.handle}`} className="podium-card" style={{ borderTop: `3px solid ${r.medal}` }}>
            <i className="ph-fill ph-trophy" style={{ fontSize: 28, color: r.medal! }} aria-label={`${r.rank}ᵉ`} />
            <div style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 18 }}>{r.initials}</div>
            <div style={{ alignSelf: 'stretch', fontWeight: 600, fontSize: 16, overflowWrap: 'anywhere' }}>{name(r.handle)}</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>{r.pts}</div>
            <div className="faint" style={{ alignSelf: 'stretch', fontSize: 12 }}>{r.solved} défis · {r.lvName}</div>
            <div className="row" style={{ alignSelf: 'stretch', justifyContent: 'center', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--cyan)', gap: 6 }}>Voir le profil<i className="ph ph-arrow-right" /></div>
          </Link>
        ))}
      </div>
      {rest.length > 0 && (
        <div className="rows">
          {rest.map(r => (
            <Link key={r.id} href={`/profil/${r.handle}`} className={`board-row${me?.id === r.id ? ' me' : ''}`}>
              <span className="mono faint">#{r.rank}</span>
              <span className="row" style={{ gap: 12, minWidth: 0 }}>
                <span style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{r.initials}</span>
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(r.handle)}</span>
              </span>
              <span className="mono muted solved" style={{ fontSize: 13, textAlign: 'right' }}>{r.solved} défis</span>
              <span className="mono" style={{ fontWeight: 700, color: 'var(--gold)', textAlign: 'right' }}>{r.pts}</span>
              <i className="ph ph-caret-right faint" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
