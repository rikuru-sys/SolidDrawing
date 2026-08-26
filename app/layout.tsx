import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '立体ドローイング',
  description: 'ランダムな立体を観察して描く、短時間ドローイング練習サイト',
  openGraph: {
    title: '立体ドローイング',
    description: '短時間で、形を見る力を鍛える',
    type: 'website',
    locale: 'ja_JP',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '立体ドローイング' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '立体ドローイング',
    description: '短時間で、形を見る力を鍛える',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
