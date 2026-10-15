import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser, safeNextPath } from '@/lib/auth';
import AuthForm from '@/components/AuthForm';

export const metadata: Metadata = { title: 'Connexion · Plateforme CTF ESATIC' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string }> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  if (await getCurrentUser()) redirect(next);
  const mode = sp.mode === 'inscription' ? 'register' : 'login';
  const q = (m: string) => `/connexion?${new URLSearchParams({ ...(m ? { mode: m } : {}), ...(next !== '/' ? { next } : {}) })}`;

  return (
    <section className="stack" style={{ maxWidth: 420, margin: '0 auto', gap: 24 }}>
      <div className="stack" style={{ gap: 8 }}>
        <div className="kicker">$ ssh esatic_cyber</div>
        <h1 className="h1">{mode === 'login' ? 'Connexion' : 'Inscription'}</h1>
        <p className="lead">{mode === 'login' ? 'Connecte-toi pour soumettre tes flags et apparaître au classement.' : 'Crée ton compte pour gagner des points sur les défis.'}</p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Link href={q('')} className={`chip${mode === 'login' ? ' on' : ''}`}>Connexion</Link>
        <Link href={q('inscription')} className={`chip${mode === 'register' ? ' on' : ''}`}>Inscription</Link>
      </div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)', padding: 24 }}>
        <AuthForm key={mode} mode={mode} next={next} />
      </div>
    </section>
  );
}
