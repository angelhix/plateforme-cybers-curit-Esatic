import Link from 'next/link';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { listChallenges } from '@/lib/data';
import { CATS, CAT_CODES, LEVELS, LEVEL_IDS, isCat, isLevel } from '@/lib/catalog';
import ChallengeCard from '@/components/ChallengeCard';

export const metadata: Metadata = { title: 'Défis · Plateforme CTF ESATIC' };

function qs(niveau: number, cat: string) {
  const p = new URLSearchParams();
  if (niveau) p.set('niveau', String(niveau));
  if (cat !== 'ALL') p.set('cat', cat);
  const s = p.toString();
  return '/defis' + (s ? '?' + s : '');
}

export default async function ChallengesPage({ searchParams }: { searchParams: Promise<{ niveau?: string; cat?: string }> }) {
  const sp = await searchParams;
  const n = Number(sp.niveau), lv = isLevel(n) ? n : 0;
  const cat = sp.cat && isCat(sp.cat) ? sp.cat : 'ALL';
  const me = await getCurrentUser();
  const all = await listChallenges(me?.id ?? null);
  const list = all.filter(c => (!lv || c.level === lv) && (cat === 'ALL' || c.catCode === cat));
  const done = all.filter(c => c.isDone).length;
  const pct = all.length ? Math.round(done / all.length * 100) : 0;

  const lvChips = [{ v: 0, label: 'Tous les niveaux', dots: '', color: '#A9BCCB' },
    ...LEVEL_IDS.map(l => ({ v: l, label: LEVELS[l].name, dots: LEVELS[l].dots, color: LEVELS[l].color }))];
  const catChips = [{ v: 'ALL', label: 'Toutes les catégories', icon: 'ph-squares-four', color: '#A9BCCB' },
    ...CAT_CODES.map(k => ({ v: k, label: k, icon: CATS[k].icon, color: CATS[k].color }))];

  return (
    <section className="stack" style={{ gap: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div className="stack" style={{ gap: 8 }}>
          <h1 className="h1">Défis</h1>
          <p className="lead">Trouve le flag <span className="mono" style={{ color: 'var(--green)' }}>ESATIC{'{…}'}</span>, gagne des points.</p>
        </div>
        {me && (
          <div className="stack" style={{ alignItems: 'flex-end', gap: 6 }}>
            <span className="mono muted" style={{ fontSize: 12 }}>{done} / {all.length} résolus</span>
            <div style={{ width: 200, height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: pct + '%', background: 'var(--green)', borderRadius: 999 }} />
            </div>
          </div>
        )}
      </div>

      <div className="stack" style={{ gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {lvChips.map(f => (
            <Link key={f.v} href={qs(f.v, cat)} className={`chip${lv === f.v ? ' on' : ''}`} aria-current={lv === f.v ? 'true' : undefined}>
              {f.dots && <span className="mono" style={{ color: f.color }}>{f.dots}</span>}{f.label}
            </Link>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {catChips.map(f => (
            <Link key={f.v} href={qs(lv, f.v)} className={`chip${cat === f.v ? ' on' : ''}`} aria-current={cat === f.v ? 'true' : undefined}>
              <i className={`ph ${f.icon}`} style={{ fontSize: 16, color: f.color }} />{f.label}
            </Link>
          ))}
        </div>
      </div>

      {list.length ? (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>
          {list.map(c => <ChallengeCard key={c.id} c={c} />)}
        </div>
      ) : (
        <div className="empty">$ find . -name &quot;défi*&quot; → aucun résultat pour ces filtres.</div>
      )}
    </section>
  );
}
