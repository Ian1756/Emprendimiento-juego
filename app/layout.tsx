import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Reto Emprendedor | Emprendimiento Tec CEM',
  description:
    'Junta clientes, ideas, recursos, talento y pasión en 60 segundos y descubre qué empresa construyes.',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0b1020',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
