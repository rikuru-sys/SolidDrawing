import type { RefObject } from 'react';
import type { ShapePrompt } from '../../domain/prompt/types';
import type { Settings } from '../settings/practice-settings';
import { LIGHT_DIRECTION_OPTIONS } from '../settings/settings-options';

type Props = {
  prompt: ShapePrompt;
  settings: Settings;
  remainingSeconds: number;
  elapsedSeconds: number;
  paused: boolean;
  canvasRef: RefObject<HTMLCanvasElement | null>;
};

export function SamplePanel({ prompt, settings, remainingSeconds, elapsedSeconds, paused, canvasRef }: Props) {
  const currentLight = LIGHT_DIRECTION_OPTIONS.find(({ value }) => value === prompt.lightDirection);
  const sampleHideAfterSeconds = settings.time === null ? 15 : Math.ceil(settings.time / 2);
  const currentQuestionElapsed = settings.time === null ? elapsedSeconds : Math.max(0, settings.time - remainingSeconds);
  const sampleHiddenByMode = settings.sampleVisibility === 'partway' && currentQuestionElapsed >= sampleHideAfterSeconds;
  const secondsUntilSampleHide = Math.max(0, sampleHideAfterSeconds - currentQuestionElapsed);
  const description = settings.sampleStyle === 'shadow' && currentLight
    ? `${settings.difficulty === 'hard' ? '難しい' : '簡単'}・光源 ${currentLight.label} ${currentLight.arrow}`
    : settings.difficulty === 'hard'
      ? '難しい・立体の向きもランダム'
      : '簡単・見る方向はランダム';

  return <section className="work-panel sample-panel">
    <div className="work-panel-header"><strong>見本</strong><small>{description + (settings.sampleVisibility === 'partway' ? '・途中で非表示' : '')}</small></div>
    <div className="canvas-stage">
      <canvas ref={canvasRef} className={paused || sampleHiddenByMode ? 'sample-canvas hidden-sample' : 'sample-canvas'} aria-label={`${prompt.shape}の見本`} aria-hidden={paused || sampleHiddenByMode} />
      {settings.sampleStyle === 'shadow' && currentLight && !paused && !sampleHiddenByMode && <span className="light-direction-badge">光源 {currentLight.label} <b aria-hidden="true">{currentLight.arrow}</b></span>}
      {settings.sampleVisibility === 'partway' && !paused && !sampleHiddenByMode && <span className="sample-hide-countdown">あと {secondsUntilSampleHide}秒で非表示</span>}
      {paused ? <div className="pause-cover"><strong>一時停止中</strong><span>{sampleHiddenByMode ? '再開後も見本は非表示です' : '再開すると見本を表示します'}</span></div>
        : sampleHiddenByMode ? <div className="sample-hidden-cover" role="status"><strong>見本を隠しました</strong><span>記憶を頼りに描きましょう</span></div>
          : null}
    </div>
  </section>;
}
