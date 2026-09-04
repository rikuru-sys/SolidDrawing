'use client';

import type { ShapePrompt } from '../../domain/prompt/types';
import { useSampleCanvas } from '../sample/use-sample-canvas';

const HERO_PROMPT: ShapePrompt = {
  id: 'hero-cube',
  shape: '立方体',
  widthScale: 1,
  heightScale: 1,
  depthScale: 1,
  cameraAzimuth: -0.7,
  cameraElevation: 0.48,
  objectRotationX: 0,
  objectRotationY: 0,
  objectRotationZ: 0,
  lightDirection: 'top-left',
};

type HomeScreenProps = {
  appVersion: string;
  onStart: () => void;
  onOpenSettings: () => void;
  onOpenFavorites: () => void;
};

export function HomeScreen({ appVersion, onStart, onOpenSettings, onOpenFavorites }: HomeScreenProps) {
  const canvasRef = useSampleCanvas({
    active: true,
    prompt: HERO_PROMPT,
    background: '#fffef9',
  });

  return <section className="hero-section">
    <div className="hero-copy">
      <div className="home-brand">
        <span className="home-brand-mark" aria-hidden="true">◇</span>
        <strong>立体ドローイング</strong>
        <small>v{appVersion}</small>
      </div>
      <p className="eyebrow">短時間で、形を見る力を鍛える</p>
      <h1>立体を観察して、<br />手を動かそう。</h1>
      <p className="lead">ランダムな方向から見た3D立体を、決めた時間内に描く練習です。最後に見本と自分の線を並べて振り返れます。</p>
      <div className="button-row hero-actions">
        <button className="button primary" type="button" onClick={onStart}>開始する</button>
        <button className="button secondary" type="button" onClick={onOpenSettings}>設定する</button>
        <button className="button secondary" type="button" onClick={onOpenFavorites}>☆ お気に入り</button>
      </div>
      <ul className="feature-list">
        <li>6種類の3D立体をその場で生成</li>
        <li>10〜60秒、または時間制限なし</li>
        <li>最大20回まで連続練習</li>
      </ul>
    </div>
    <div className="hero-visual">
      <canvas ref={canvasRef} className="hero-canvas" aria-label="薄い陰影が付いた立方体" />
      <span className="visual-caption">ランダムな角度で出題</span>
    </div>
  </section>;
}
