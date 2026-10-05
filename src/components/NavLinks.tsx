'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Accueil', icon: 'ph-house' },
  { href: '/cours', label: 'Cours', icon: 'ph-books' },
  { href: '/defis', label: 'Défis', icon: 'ph-flag' },
  { href: '/classement', label: 'Classement', icon: 'ph-trophy' },
];

export default function NavLinks({ meHandle }: { meHandle: string | null }) {
  const path = usePathname();
  const active = (href: string) => {
    if (href === '/') return path === '/';
    // Le profil d'un autre joueur s'ouvre depuis le classement ; le sien depuis l'avatar.
    if (href === '/classement') return path === href || (path.startsWith('/profil/') && path !== `/profil/${meHandle}`);
    return path === href || path.startsWith(href + '/');
  };
  return (
    <nav className="nav">
      {ITEMS.map(n => (
        <Link key={n.href} href={n.href} className={active(n.href) ? 'on' : undefined} aria-current={active(n.href) ? 'page' : undefined}>
          <i className={`ph ${n.icon}`} /><span className="navlbl">{n.label}</span>
        </Link>
      ))}
    </nav>
  );
}
