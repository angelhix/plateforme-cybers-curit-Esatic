import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { listChallenges } from '@/lib/data';
import { LEVELS, LEVEL_IDS, banner, levelAvailable } from '@/lib/catalog';
import ChallengeCard from '@/components/ChallengeCard';

export default async function HomePage() {
  const me = await getCurrentUser();
  const featured = (await listChallenges(me?.id ?? null)).filter(c => !c.isDone).slice(0, 4);

  return (
    <section className="stack" style={{ gap: 56 }}>
      <div className="split" style={{ gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)', gap: 48, alignItems: 'center' }}>
        <div className="stack" style={{ gap: 20 }}>
          <div className="kicker">SECTION CYBERSÉCURITÉ · CLUB INFORMATIQUE ESATIC</div>
          <h1 className="display home-title" style={{ margin: 0, fontSize: 52, lineHeight: 1.05, fontWeight: 700, textWrap: 'balance' }}>
            Apprends la cybersécurité. <span style={{ color: 'var(--green)' }}>En pratiquant.</span>
          </h1>
          <p className="muted" style={{ margin: 0, fontSize: 18, lineHeight: 1.6, maxWidth: 520, textWrap: 'pretty' }}>
            Tous les cours de la section, du premier terminal jusqu’à Active Directory. Lis-les en ligne, télécharge-les en PDF, puis teste-toi sur les défis.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            <Link href="/cours" className="btn btn-primary"><i className="ph ph-books" />Voir les cours</Link>
            <Link href="/defis" className="btn btn-outline"><i className="ph ph-flag" />Relever un défi</Link>
          </div>
        </div>
        <div className="term" style={{ boxShadow: '0 24px 60px rgba(0,0,0,.4)' }}>
          <div className="term-bar">
            <span className="dot" style={{ background: '#FF5F57' }} /><span className="dot" style={{ background: '#FEBC2E' }} /><span className="dot" style={{ background: '#28C840' }} />
            <span className="title">{me?.handle ?? 'invite'}@esatic:~/cours</span>
          </div>
          <div className="term-body">
            <div><span className="p">$</span> ls niveau_2/</div>
            <div className="o">systemes/  recon/  web/  exploitation/</div>
            <div><span className="p">$</span> nmap -sV 10.10.1.20</div>
            <div className="o">22/tcp   open  ssh    OpenSSH 8.2</div>
            <div className="o">8080/tcp open  http   Werkzeug</div>
            <div><span className="p">$</span> cat flag.txt</div>
            <div className="p">ESATIC{'{'}ton_premier_flag{'}'}<span style={{ display: 'inline-block', width: 8, height: 16, background: 'var(--cyan)', verticalAlign: -2, marginLeft: 4, animation: 'blink 1.1s steps(1) infinite' }} /></div>
          </div>
        </div>
      </div>

      <div className="stack" style={{ gap: 20 }}>
        <div className="section-head">
          <h2 className="h2">Les parcours</h2>
          <span className="muted" style={{ fontSize: 14 }}>3 niveaux · 4 parties chacun · aucun prérequis</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
          {LEVEL_IDS.map(n => {
            const L = LEVELS[n], ok = levelAvailable(n);
            return (
              <Link key={n} href={`/cours?niveau=${n}`} className="card">
                <div className="banner" style={{ height: 120, background: banner(L.color), alignItems: 'flex-end', justifyContent: 'space-between', padding: '16px 20px' }}>
                  <span className="display" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1, color: L.color }}>0{n}</span>
                  <span className="mono" style={{ fontSize: 18, letterSpacing: '.1em', color: L.color }}>{L.dots}</span>
                </div>
                <div className="stack" style={{ padding: 20, gap: 8, flex: 1 }}>
                  <div className="display" style={{ fontSize: 22, fontWeight: 600 }}>{L.name}</div>
                  <div className="muted" style={{ fontSize: 14, lineHeight: 1.55, textWrap: 'pretty' }}>{L.desc}</div>
                  <div className="mono faint" style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span>{ok ? '20 cours · 40 PDF' : 'En préparation'}</span>
                    <span style={{ color: ok ? 'var(--cyan)' : 'var(--text-3)' }}>{ok ? 'Ouvrir →' : 'Bientôt'}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {featured.length > 0 && (
        <div className="stack" style={{ gap: 20 }}>
          <div className="section-head">
            <h2 className="h2">Défis à tenter</h2>
            <Link href="/defis" className="link-btn">Tous les défis<i className="ph ph-arrow-right" /></Link>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))' }}>
            {featured.map(c => <ChallengeCard key={c.id} c={c} compact />)}
          </div>
        </div>
      )}
    </section>
  );
}
