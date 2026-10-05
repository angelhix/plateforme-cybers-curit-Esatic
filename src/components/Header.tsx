import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { userPoints } from '@/lib/data';
import NavLinks from './NavLinks';

export default async function Header() {
  const me = await getCurrentUser();
  return (
    <header className="hdr">
      <div className="hdr-left">
        <Link href="/" className="brand" aria-label="Accueil">
          <span className="gt">&gt;</span>&nbsp;<span className="navlbl">esatic_cyber</span><span className="cursor" />
        </Link>
        <NavLinks meHandle={me?.handle ?? null} />
      </div>
      <div className="hdr-right">
        {me ? (
          <>
            <div className="pts-chip"><i className="ph-fill ph-lightning" />{userPoints(me.id)} pts</div>
            <Link href={`/profil/${me.handle}`} className="avatar-btn" title="Mon profil">{me.initials}</Link>
          </>
        ) : (
          <Link href="/connexion" className="btn btn-outline" style={{ height: 40, padding: '0 16px', fontSize: 14 }}>
            <i className="ph ph-sign-in" style={{ fontSize: 18 }} />Connexion
          </Link>
        )}
      </div>
    </header>
  );
}
