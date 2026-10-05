import Link from 'next/link';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { CATS, CAT_CODES, LEVELS, LEVEL_IDS, banner, docHref, getCourse, isLevel, levelAvailable, type Level } from '@/lib/catalog';

export const metadata: Metadata = { title: 'Cours · Plateforme CTF ESATIC' };

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ niveau?: string }> }) {
  const { niveau } = await searchParams;
  const me = await getCurrentUser();
  const n = Number(niveau);
  const lvl: Level = isLevel(n) ? n : (me?.level ?? 1);
  const avail = levelAvailable(lvl);

  return (
    <section className="stack" style={{ gap: 32 }}>
      <div className="stack" style={{ gap: 8 }}>
        <h1 className="h1">Cours</h1>
        <p className="lead">Chaque cours contient un document à lire et des travaux pratiques, disponibles en PDF.</p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {LEVEL_IDS.map(l => (
          <Link key={l} href={`/cours?niveau=${l}`} className={`chip chip-lg${l === lvl ? ' on' : ''}`} aria-current={l === lvl ? 'true' : undefined}>
            <span className="mono" style={{ color: LEVELS[l].color }}>{LEVELS[l].dots}</span>{LEVELS[l].name}
            <span className="mono faint" style={{ fontSize: 12 }}>{levelAvailable(l) ? '20' : '—'}</span>
          </Link>
        ))}
      </div>

      {avail ? (
        <div className="stack" style={{ gap: 40 }}>
          {CAT_CODES.map((code, i) => {
            const C = CATS[code];
            return (
              <div key={code} className="stack" style={{ gap: 16 }}>
                <div className="row" style={{ gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: C.color + '1F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={`ph ${C.icon}`} style={{ fontSize: 22, color: C.color }} />
                  </div>
                  <div className="stack">
                    <span className="mono" style={{ fontSize: 11, letterSpacing: '.1em', color: C.color }}>PARTIE {i + 1} · {code}</span>
                    <span className="display" style={{ fontSize: 20, fontWeight: 600 }}>{C.name}</span>
                  </div>
                </div>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
                  {[0, 1, 2, 3, 4].map(j => {
                    const c = getCourse(lvl, i * 5 + j)!;
                    return (
                      <div key={c.k} className="card lift">
                        <Link href={c.href} className="stack" style={{ color: 'var(--text)' }}>
                          <div className="banner" style={{ height: 84, background: banner(c.catColor), alignItems: 'flex-end', justifyContent: 'space-between', padding: '12px 14px' }}>
                            <span className="display" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color: c.catColor }}>{c.num}</span>
                            <i className={`ph ${c.catIcon}`} style={{ fontSize: 24, color: c.catColor }} />
                          </div>
                          <div className="display" style={{ padding: '14px 14px 6px', fontSize: 17, fontWeight: 600 }}>{c.title}</div>
                        </Link>
                        <div className="row" style={{ padding: '6px 14px 14px', justifyContent: 'space-between', marginTop: 'auto' }}>
                          <span className="faint" style={{ fontSize: 12 }}>2 documents</span>
                          <a href={docHref(lvl, c.k, 'Preparatoire', 'pdf')} download className="icon-dl" title="Télécharger le document préparatoire (PDF)" aria-label={`Télécharger le PDF du cours ${c.title}`}>
                            <i className="ph ph-download-simple" style={{ fontSize: 18 }} />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="stack" style={{ border: '1px dashed var(--border-strong)', borderRadius: 12, padding: '48px 24px', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <i className="ph ph-hourglass-medium" style={{ fontSize: 40, color: '#FF8A65' }} />
          <div className="display" style={{ fontSize: 22, fontWeight: 600 }}>Le niveau {LEVELS[lvl].name} arrive bientôt</div>
          <div className="muted" style={{ fontSize: 15, maxWidth: 440 }}>Les cours sont en préparation. Ils apparaîtront ici dès leur publication.</div>
        </div>
      )}
    </section>
  );
}
