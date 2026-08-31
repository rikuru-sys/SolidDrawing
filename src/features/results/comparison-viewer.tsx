/* eslint-disable @next/next/no-img-element -- comparison images are generated data URLs */

import type { Attempt, ComparisonMode } from './types';
import type { ReactNode } from 'react';

type Props = {
  attempt: Attempt;
  resultNumber: number;
  mode: ComparisonMode;
  overlayOpacity: number;
  onModeChange: (mode: ComparisonMode) => void;
  onOverlayOpacityChange: (opacity: number) => void;
  children?: ReactNode;
};

export function ComparisonViewer({ attempt, resultNumber, mode, overlayOpacity, onModeChange, onOverlayOpacityChange, children }: Props) {
  return <>
    <div className="comparison-heading">
      <div className="comparison-title" aria-live="polite" aria-atomic="true"><h3>{resultNumber}　{attempt.prompt.shape}</h3><span>{attempt.practiceMode === 'sample-only'
        ? '見本のみ表示モードの練習記録'
        : mode === 'overlay' ? '中心を合わせて見本と描画を比較' : '見本と描画を横並びで比較'}</span></div>
      {attempt.practiceMode === 'canvas' && <div className="comparison-mode-buttons" role="group" aria-label="比較方法">
        <button className={mode === 'side-by-side' ? 'selected' : ''} type="button" aria-pressed={mode === 'side-by-side'} onClick={() => onModeChange('side-by-side')}>横並び</button>
        <button className={mode === 'overlay' ? 'selected' : ''} type="button" aria-pressed={mode === 'overlay'} onClick={() => onModeChange('overlay')}>重ね合わせ</button>
      </div>}
    </div>
    <div className={attempt.practiceMode === 'sample-only' ? 'comparison-body sample-only-result-body' : 'comparison-body'}>
      <div className="comparison-visual">
      {attempt.practiceMode === 'sample-only' ? <>
        <div className="comparison-panes sample-only-result"><figure className="compare-pane"><figcaption>見本</figcaption><div><img src={attempt.sampleImage} alt={`${attempt.prompt.shape}の見本`} /></div></figure></div>
        <div className="sample-only-result-note"><strong>自動評価なし</strong><span>外部のペイントソフトで描いた結果はこのサイトには保存されないため、形状評価は行いません。</span></div>
      </> : mode === 'overlay' ? <div className="overlay-comparison">
        <div className="overlay-stage"><img src={attempt.sampleImage} alt={`${attempt.prompt.shape}の見本`} /><img className="overlay-drawing" src={attempt.alignedDrawingSvg} alt={`${attempt.prompt.shape}を描いた結果の重ね合わせ`} style={{ opacity: overlayOpacity }} /></div>
        <label className="overlay-opacity-control"><span>描画の濃さ {Math.round(overlayOpacity * 100)}%</span><input type="range" min="0.2" max="1" step="0.05" value={overlayOpacity} onChange={(event) => onOverlayOpacityChange(Number(event.target.value))} aria-label="重ね合わせる描画の濃さ" /></label>
      </div> : <div className="comparison-panes">
        <figure className="compare-pane"><figcaption>見本</figcaption><div><img src={attempt.sampleImage} alt={`${attempt.prompt.shape}の見本`} /></div></figure>
        <figure className="compare-pane"><figcaption>描いたもの</figcaption><div><img src={attempt.drawingSvg} alt={`${attempt.prompt.shape}を描いた結果`} /></div></figure>
      </div>}
      </div>
      {children}
    </div>
  </>;
}
