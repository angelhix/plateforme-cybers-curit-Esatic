import type { Metadata, Viewport } from 'next';
import '@phosphor-icons/web/regular';
import '@phosphor-icons/web/fill';
import './globals.css';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Plateforme CTF · Section Cybersécurité ESATIC',
  description: 'Cours et défis CTF de la Section Cybersécurité du Club Informatique de l’ESATIC.',
};

export const viewport: Viewport = { themeColor: '#071A2B', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" />
      </head>
      <body>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
