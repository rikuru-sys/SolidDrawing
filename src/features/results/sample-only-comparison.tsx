/* eslint-disable @next/next/no-img-element -- comparison images are generated data URLs */

import type { Attempt } from './types';

type Props = {
  attempt: Attempt;
  resultNumber: number;
};

export function SampleOnlyComparison({ attempt, resultNumber }: Props) {
  return <>
    <div className="comparison-heading">
      <div className="comparison-title" aria-live="polite" aria-atomic="true"><h3>{resultNumber}　{attempt.prompt.shape}</h3><span>見本のみ表示モードの練習記録</span></div>
    </div>
    <div className="comparison-body sample-only-result-body">
      <div className="comparison-visual">
        <div className="comparison-panes sample-only-result"><figure className="compare-pane"><figcaption>見本</figcaption><div><img src={attempt.sampleImage} alt={`${attempt.prompt.shape}の見本`} /></div></figure></div>
        <div className="sample-only-result-note"><strong>自動評価なし</strong><span>外部のペイントソフトで描いた結果はこのサイトには保存されないため、形状評価は行いません。</span></div>
      </div>
    </div>
  </>;
}
