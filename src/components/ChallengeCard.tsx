import Link from 'next/link';
import type { Challenge } from '@/lib/data';

/** Carte de défi à bannière. `compact` = variante de l'accueil (« Défis à tenter »). */
export default function ChallengeCard({ c, compact = false }: { c: Challenge; compact?: boolean }) {
  return (
    <Link href={c.href} className="card">
      <div className="banner" style={{ height: compact ? 110 : 130, background: c.banner, alignItems: 'center', justifyContent: 'center' }}>
        <i className={`ph ${c.catIcon}`} style={{ fontSize: compact ? 52 : 60, color: c.catColor }} />
        <span className="pill" style={{ position: 'absolute', left: 12, top: 12, color: c.lvColor }}>{compact ? c.lvName : c.lvLabel}</span>
        {!compact && c.isDone && (
          <span style={{ position: 'absolute', right: 12, top: 12, width: 28, height: 28, borderRadius: 999, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ph-fill ph-check" style={{ fontSize: 16, color: 'var(--on-accent)' }} />
          </span>
        )}
        {!compact && <span className="mono" style={{ position: 'absolute', right: 12, bottom: 10, fontSize: 11, color: c.catColor }}>{c.catCode}</span>}
      </div>
      {compact ? (
        <div className="stack" style={{ padding: 16, gap: 6 }}>
          <div className="display" style={{ fontSize: 17, fontWeight: 600 }}>{c.title}</div>
          <div className="mono faint" style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <span>{c.catCode}</span><span>{c.pts} pts</span><span>{c.solves} résolution{c.solves > 1 ? 's' : ''}</span>
          </div>
        </div>
      ) : (
        <div className="stack" style={{ padding: 16, gap: 8, flex: 1 }}>
          <div className="display" style={{ fontSize: 18, fontWeight: 600 }}>{c.title}</div>
          <div className="muted" style={{ fontSize: 14, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.desc}</div>
          <div className="mono faint" style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', alignItems: 'center', gap: 14, fontSize: 12 }}>
            <span className="row" style={{ gap: 4, color: 'var(--gold)' }}><i className="ph-fill ph-lightning" />{c.pts}</span>
            <span className="row" style={{ gap: 4 }}><i className="ph ph-users" />{c.solves}</span>
            <span style={{ marginLeft: 'auto', color: c.stColor }}>{c.stLabel}</span>
          </div>
        </div>
      )}
    </Link>
  );
}
