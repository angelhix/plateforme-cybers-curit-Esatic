import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { listChallenges } from '@/lib/data';
import { COURSES_PER_LEVEL, banner, docHref, getCourse, isLevel, type Level } from '@/lib/catalog';

type Params = Promise<{ niveau: string; num: string }>;

function resolve(niveau: string, num: string) {
  const n = Number(niveau);
  return isLevel(n) ? getCourse(n, Number(num) - 1) : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { niveau, num } = await params;
  const c = resolve(niveau, num);
  return { title: c ? `${c.title} · Cours · Plateforme CTF ESATIC` : 'Cours introuvable' };
}

const DOCS = [
  { label: 'Document préparatoire', sub: 'À lire avant de pratiquer · théorie et exemples', icon: 'ph-book-open-text', kind: 'Preparatoire' },
  { label: 'Travaux pratiques', sub: 'Exercices guidés sur le lab', icon: 'ph-terminal-window', kind: 'Pratique' },
] as const;

export default async function CoursePage({ params }: { params: Params }) {
  const { niveau, num } = await params;
  const cur = resolve(niveau, num);
  if (!cur) notFound();
  const lvl = cur.level as Level;
  const me = await getCurrentUser();
  const related = listChallenges(me?.id ?? null).filter(c => c.catCode === cur.catCode && c.level === lvl);
  const prev = getCourse(lvl, cur.k - 1), next = cur.k < COURSES_PER_LEVEL - 1 ? getCourse(lvl, cur.k + 1) : null;

  return (
    <section className="stack" style={{ gap: 32 }}>
      <div className="hero" style={{ background: banner(cur.catColor) }}>
        <Link href={`/cours?niveau=${lvl}`} className="back"><i className="ph ph-arrow-left" />Cours · {cur.levelName}</Link>
        <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
          <div className="hero-icon" style={{ width: 72, height: 72 }}><i className={`ph ${cur.catIcon}`} style={{ fontSize: 38, color: cur.catColor }} /></div>
          <div className="stack" style={{ gap: 6 }}>
            <span className="mono" style={{ fontSize: 12, letterSpacing: '.1em', color: cur.catColor }}>COURS {cur.num} · PARTIE {cur.part} · {cur.catCode}</span>
            <h1 className="h1" style={{ lineHeight: 1.1 }}>{cur.title}</h1>
          </div>
        </div>
      </div>

      <div className="split">
        <div className="stack" style={{ gap: 16 }}>
          <h2 className="h3">Documents</h2>
          {DOCS.map(d => (
            <div key={d.kind} className="row" style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)', padding: 20, gap: 16, flexWrap: 'wrap' }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ph ${d.icon}`} style={{ fontSize: 24, color: 'var(--cyan)' }} />
              </div>
              <div className="stack" style={{ flex: 1, minWidth: 180, gap: 2 }}>
                <span className="display" style={{ fontSize: 18, fontWeight: 600 }}>{d.label}</span>
                <span className="muted" style={{ fontSize: 14 }}>{d.sub}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={docHref(lvl, cur.k, d.kind, 'dc.html')} target="_blank" rel="noopener" className="btn btn-outline" style={{ height: 44, padding: '0 16px', fontSize: 14, fontWeight: 500 }}>
                  <i className="ph ph-book-open" style={{ fontSize: 18 }} />Lire
                </a>
                <a href={docHref(lvl, cur.k, d.kind, 'pdf')} download className="btn btn-primary" style={{ height: 44, padding: '0 16px', fontSize: 14 }}>
                  <i className="ph ph-file-pdf" style={{ fontSize: 18 }} />PDF
                </a>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 8 }}>
            {prev ? <Link href={prev.href} className="pager-link"><i className="ph ph-arrow-left" />{prev.title}</Link> : <span />}
            {next ? <Link href={next.href} className="pager-link">{next.title}<i className="ph ph-arrow-right" /></Link> : <span />}
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <h2 className="h3">Mets-toi à l’épreuve</h2>
          {related.map(c => (
            <Link key={c.id} href={c.href} className="row mini-ch">
              <div style={{ width: 44, height: 44, borderRadius: 8, background: c.banner, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ph ${c.catIcon}`} style={{ fontSize: 22, color: c.catColor }} />
              </div>
              <div className="stack" style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{c.title}</span>
                <span className="mono faint" style={{ fontSize: 12 }}>{c.lvName} · {c.pts} pts</span>
              </div>
              <i className={`ph ${c.stIcon}`} style={{ fontSize: 20, color: c.stColor }} aria-label={c.stLabel} />
            </Link>
          ))}
          {!related.length && <div className="faint" style={{ fontSize: 14 }}>Pas encore de défi pour cette partie.</div>}
        </div>
      </div>
    </section>
  );
}
