import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { leaderboard, listChallenges, solvedBy } from '@/lib/data';
import { CATS, CAT_CODES, LEVELS, LEVEL_IDS, banner, levelLabel } from '@/lib/catalog';
import { logout } from '@/app/actions';

type Params = Promise<{ handle: string }>;
const PER_PAGE = 6;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return { title: `${decodeURIComponent((await params).handle)} · Profil · Plateforme CTF ESATIC` };
}

export default async function ProfilePage({ params, searchParams }: { params: Params; searchParams: Promise<{ page?: string }> }) {
  const handle = decodeURIComponent((await params).handle);
  const board = leaderboard();
  const P = board.find(r => r.handle === handle);
  if (!P) notFound();
  const me = await getCurrentUser();
  const isMe = me?.id === P.id;
  const all = listChallenges(null);
  const solved = solvedBy(P.id);
  const ids = new Set(solved.map(c => c.id));
  const next = board[P.rank];
  const L = LEVELS[P.level];
  const ring = P.medal ?? '#2E5573';

  const pages = Math.max(1, Math.ceil(solved.length / PER_PAGE));
  const pg = Math.min(Math.max(1, Number((await searchParams).page) || 1), pages);
  const shown = solved.slice((pg - 1) * PER_PAGE, pg * PER_PAGE);
  const pageHref = (n: number) => `/profil/${encodeURIComponent(P.handle)}${n > 1 ? `?page=${n}` : ''}`;

  return (
    <section className="stack" style={{ gap: 32 }}>
      <div className="hero" style={{ background: banner(L.color), gap: 24 }}>
        <Link href="/classement" className="back"><i className="ph ph-arrow-left" />Classement</Link>
        <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
          <div className="display" style={{ width: 88, height: 88, borderRadius: 999, background: 'var(--surface-3)', border: `3px solid ${ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 30, flexShrink: 0 }}>{P.initials}</div>
          <div className="stack" style={{ gap: 10, minWidth: 0 }}>
            <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
              <h1 className="mono" style={{ margin: 0, fontSize: 34, lineHeight: 1.1, overflowWrap: 'anywhere' }}>{P.handle}</h1>
              {isMe && <span className="pill pill-lg" style={{ background: '#00B8D926', color: 'var(--cyan)' }}>C’est toi</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="pill pill-lg" style={{ color: L.color }}>{levelLabel(P.level)}</span>
              <span className="pill pill-lg" style={{ gap: 4, color: P.medal ?? 'var(--text-2)' }}><i className="ph-fill ph-trophy" />#{P.rank} sur {board.length}</span>
            </div>
          </div>
          {isMe && (
            <form action={logout} style={{ marginLeft: 'auto' }}>
              <button type="submit" className="btn btn-outline" style={{ height: 40, padding: '0 14px', fontSize: 14 }}><i className="ph ph-sign-out" style={{ fontSize: 18 }} />Se déconnecter</button>
            </form>
          )}
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          <Stat label="Points"><span style={{ color: 'var(--gold)' }}>{P.pts}</span></Stat>
          <Stat label="Défis résolus">{P.solved}<span style={{ fontSize: 15, color: 'var(--text-3)' }}>/{all.length}</span></Stat>
          <Stat label="Écart avec le suivant"><span style={{ color: 'var(--green)' }}>{next ? `+${P.pts - next.pts} pts` : '—'}</span></Stat>
        </div>
      </div>

      <div className="split" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr)' }}>
        <div className="stack" style={{ gap: 28 }}>
          <div className="stack" style={{ gap: 14 }}>
            <h2 className="h3">Par catégorie</h2>
            {CAT_CODES.map(code => {
              const C = CATS[code], l = all.filter(c => c.catCode === code), n = l.filter(c => ids.has(c.id)).length;
              return (
                <div key={code} className="stack" style={{ gap: 8 }}>
                  <div className="row" style={{ gap: 10, fontSize: 14 }}>
                    <i className={`ph ${C.icon}`} style={{ fontSize: 20, color: C.color }} /><span style={{ flex: 1, minWidth: 0 }}>{C.name}</span>
                    <span className="mono muted">{n}/{l.length}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: (l.length ? Math.round(n / l.length * 100) : 0) + '%', background: C.color, borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="stack" style={{ gap: 14 }}>
            <h2 className="h3">Par niveau</h2>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
              {LEVEL_IDS.map(lv => {
                const l = all.filter(c => c.level === lv);
                return (
                  <div key={lv} className="stack" style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', padding: '12px 14px', gap: 4 }}>
                    <span style={{ display: 'flex', flexWrap: 'wrap', columnGap: 4, fontSize: 12, fontWeight: 600, color: LEVELS[lv].color, minWidth: 0 }}>
                      <span>{LEVELS[lv].dots}</span><span style={{ overflowWrap: 'anywhere' }}>{LEVELS[lv].name}</span>
                    </span>
                    <span className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{l.filter(c => ids.has(c.id)).length}<span style={{ fontSize: 13, color: 'var(--text-3)' }}>/{l.length}</span></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="stack" style={{ gap: 14 }}>
          <h2 className="h3">Défis résolus <span className="mono faint" style={{ fontSize: 15 }}>({solved.length})</span></h2>
          {shown.length ? (
            <>
              <div className="rows">
                {shown.map(c => (
                  <Link key={c.id} href={c.href} style={{ display: 'grid', gridTemplateColumns: '36px minmax(0,1fr) auto', alignItems: 'center', gap: 12, padding: '10px 16px', minHeight: 56 }}>
                    <span style={{ width: 36, height: 36, borderRadius: 8, background: c.banner, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className={`ph ${c.catIcon}`} style={{ fontSize: 18, color: c.catColor }} /></span>
                    <span className="stack" style={{ minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                      <span style={{ fontSize: 12, color: c.lvColor }}>{c.lvLabel} <span className="faint">· {c.catCode}</span></span>
                    </span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>+{c.pts}</span>
                  </Link>
                ))}
              </div>
              {pages > 1 && (
                <nav className="row" aria-label="Pages des défis résolus" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <span className="mono muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{(pg - 1) * PER_PAGE + 1}–{(pg - 1) * PER_PAGE + shown.length} sur {solved.length}</span>
                  <div className="row" style={{ gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
                    <PageBtn href={pg > 1 ? pageHref(pg - 1) : null} title="Page précédente"><i className="ph ph-caret-left" style={{ fontSize: 18 }} /></PageBtn>
                    {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
                      <PageBtn key={n} href={pageHref(n)} on={n === pg}><span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{n}</span></PageBtn>
                    ))}
                    <PageBtn href={pg < pages ? pageHref(pg + 1) : null} title="Page suivante"><i className="ph ph-caret-right" style={{ fontSize: 18 }} /></PageBtn>
                  </div>
                </nav>
              )}
            </>
          ) : (
            <div className="empty" style={{ padding: 32 }}>$ cat solved.txt → vide pour l’instant.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="stack" style={{ borderRadius: 10, background: '#06141FB3', padding: '14px 16px', gap: 4 }}>
      <span className="muted" style={{ fontSize: 12 }}>{label}</span>
      <span className="mono" style={{ fontSize: 24, fontWeight: 700 }}>{children}</span>
    </div>
  );
}

function PageBtn({ href, on, title, children }: { href: string | null; on?: boolean; title?: string; children: React.ReactNode }) {
  const cls = `page-btn${on ? ' on' : ''}`;
  if (!href) return <span className={cls} aria-disabled="true" title={title} style={{ opacity: 0.4 }}>{children}</span>;
  return <Link href={href} className={cls} title={title} aria-current={on ? 'page' : undefined}>{children}</Link>;
}
