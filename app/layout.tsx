import './globals.css';
import type { Metadata, Viewport } from 'next';
import { A11yBar } from '@/components/A11y';
import { I18nRoot } from '@/components/I18n';

export const metadata: Metadata = {
  title: 'LUMEN — Resultados con claridad, seguridad y acompañamiento',
  description: 'Prototipo con datos ficticios para EIRA Movimiento Rosa A.C.',
  robots: { index: false, follow: false },
  manifest: '/manifest.webmanifest',
};
export const viewport: Viewport = { themeColor: '#0B0B0F', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 btn-primary">Saltar al contenido</a>
        <A11yBar />
        <I18nRoot />
        {children}
      </body>
    </html>
  );
}
