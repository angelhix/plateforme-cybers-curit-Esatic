import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { getChallenge } from '@/lib/data';
import FlagForm from '@/components/FlagForm';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const ch = await getChallenge((await params).id, null);
  return { title: ch ? `${ch.title} · Défis · Plateforme CTF ESATIC` : 'Défi introuvable' };
}

export default async function ChallengePage({ params }: { params: Params }) {
  const { id } = await params;
  const me = await getCurrentUser();
  const ch = await getChallenge(id, me?.id ?? null);
  if (!ch) notFound();

  return (
    <section className="stack" style={{ gap: 32 }}>
      <div className="hero" style={{ background: ch.banner }}>
        <Link href="/defis" className="back"><i className="ph ph-arrow-left" />Tous les défis</Link>
        <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
          <div className="hero-icon" style={{ width: 80, height: 80, borderRadius: 16 }}><i className={`ph ${ch.catIcon}`} style={{ fontSize: 44, color: ch.catColor }} /></div>
          <div className="stack" style={{ gap: 8 }}>
            <h1 className="h1" style={{ lineHeight: 1.1 }}>{ch.title}</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="pill pill-lg" style={{ color: ch.lvColor }}>{ch.lvLabel}</span>
              <span className="pill pill-lg" style={{ color: ch.catColor }}>{ch.catName}</span>
              <span className="pill pill-lg" style={{ color: 'var(--gold)', gap: 4 }}><i className="ph-fill ph-lightning" />{ch.pts} pts</span>
              <span className="pill pill-lg muted" style={{ gap: 4 }}><i className="ph ph-users" />{ch.solves} résolution{ch.solves > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="split">
        <div className="stack" style={{ gap: 24 }}>
          <div className="stack" style={{ gap: 8 }}>
            <h2 className="h3">Mission</h2>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: 'var(--text-body)', textWrap: 'pretty' }}>{ch.desc}</p>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <h2 className="h3">Ce que tu vas apprendre</h2>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: 'var(--text-body)' }}>{ch.goal}</p>
          </div>
          <div className="term">
            <div className="term-bar" style={{ height: 34 }}>
              <span className="dot" style={{ width: 10, height: 10, background: '#FF5F57' }} /><span className="dot" style={{ width: 10, height: 10, background: '#FEBC2E' }} /><span className="dot" style={{ width: 10, height: 10, background: '#28C840' }} />
              <span className="title">point de départ</span>
            </div>
            <div className="term-body" style={{ padding: 18, lineHeight: 1.7 }}>
              <div><span className="p">$</span> {ch.cmd}</div>
              <div className="o">{ch.out}</div>
            </div>
          </div>
        </div>

        <div className="stack" style={{ position: 'sticky', top: 88, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)', padding: 20, gap: 14 }}>
          <div className="display" style={{ fontSize: 20, fontWeight: 600 }}>Soumettre le flag</div>
          {ch.isDone ? (
            <div className="row" style={{ borderRadius: 8, background: '#00C8531F', padding: 16, gap: 12, color: 'var(--green)', fontWeight: 600 }}>
              <i className="ph-fill ph-check-circle" style={{ fontSize: 24 }} />Défi résolu · +{ch.pts} pts
            </div>
          ) : (
            <FlagForm challengeId={ch.id} loggedIn={!!me} />
          )}
          {ch.course && (
            <Link href={ch.course.href} className="row course-link">
              <i className="ph ph-book-open-text" style={{ fontSize: 22, color: 'var(--cyan)' }} />
              <span className="stack" style={{ flex: 1 }}>
                <span className="faint" style={{ fontSize: 12 }}>Bloqué ? Revois le cours</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{ch.course.title}</span>
              </span>
              <i className="ph ph-arrow-right faint" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
