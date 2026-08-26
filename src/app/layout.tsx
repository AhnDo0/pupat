import type { Metadata, Viewport } from 'next';
import { Gowun_Dodum, IBM_Plex_Mono } from 'next/font/google';

import { ServiceWorkerRegistrar } from '@/components/pwa/ServiceWorkerRegistrar';
import './globals.css';

const gowunDodum = Gowun_Dodum({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-gowun-dodum',
});

const plexMono = IBM_Plex_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  title: '쓰담하개',
  description: '키울 수는 없어도, 쓰다듬을 수는 있으니까. 웹에서 강아지를 직접 쓰다듬어 보세요.',
  applicationName: '쓰담하개',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: '쓰담하개',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    title: '쓰담하개',
    description: '키울 수는 없어도, 쓰다듬을 수는 있으니까.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 노치/홈 인디케이터가 있는 기기에서 safe-area 값을 쓰기 위해
  viewportFit: 'cover',
  themeColor: '#f6efe3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${gowunDodum.variable} ${plexMono.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
