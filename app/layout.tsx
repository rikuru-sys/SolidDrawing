import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://rikuru-sys.github.io/SolidDrawing/'),
  title: '立体ドローイング',
  description: 'ランダムな立体を観察して描く、短時間ドローイング練習サイト',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  alternates: { canonical: 'https://rikuru-sys.github.io/SolidDrawing/' },
  openGraph: {
    title: '立体ドローイング',
    description: '短時間で、形を見る力を鍛える',
    type: 'website',
    locale: 'ja_JP',
    url: 'https://rikuru-sys.github.io/SolidDrawing/',
    images: [{ url: 'https://rikuru-sys.github.io/SolidDrawing/og.png', width: 1200, height: 630, alt: '立体ドローイング' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '立体ドローイング',
    description: '短時間で、形を見る力を鍛える',
    images: ['https://rikuru-sys.github.io/SolidDrawing/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
