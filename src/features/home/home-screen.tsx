'use client';

import type { RefObject } from 'react';

type HomeScreenProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onStart: () => void;
  onOpenSettings: () => void;
};

export function HomeScreen({ canvasRef, onStart, onOpenSettings }: HomeScreenProps) {
  return <section className="hero-section">
    <div className="hero-copy">
      <p className="eyebrow">短時間で、形を見る力を鍛える</p>
      <h1>立体を観察して、<br />手を動かそう。</h1>
      <p className="lead">ランダムな方向から見た3D立体を、決めた時間内に描く練習です。最後に見本と自分の線を並べて振り返れます。</p>
      <div className="button-row hero-actions">
        <button className="button primary" type="button" onClick={onStart}>開始する</button>
        <button className="button secondary" type="button" onClick={onOpenSettings}>設定する</button>
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
