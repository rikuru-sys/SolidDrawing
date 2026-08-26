import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://solid-drawing-practice.pastel-minutes.chatgpt.site'),
  title: '立体ドローイング',
  description: 'ランダムな立体を観察して描く、短時間ドローイング練習サイト',
  alternates: { canonical: 'https://solid-drawing-practice.pastel-minutes.chatgpt.site' },
  openGraph: {
    title: '立体ドローイング',
    description: '短時間で、形を見る力を鍛える',
    type: 'website',
    locale: 'ja_JP',
    url: 'https://solid-drawing-practice.pastel-minutes.chatgpt.site',
    images: [{ url: 'https://solid-drawing-practice.pastel-minutes.chatgpt.site/og.png', width: 1200, height: 630, alt: '立体ドローイング' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '立体ドローイング',
    description: '短時間で、形を見る力を鍛える',
    images: ['https://solid-drawing-practice.pastel-minutes.chatgpt.site/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
