import type { RefObject } from 'react';
import { practiceModeDetails } from '../settings/practice-mode';
import type { SampleStyle, Settings } from '../settings/practice-settings';
import { LIGHT_DIRECTION_OPTIONS } from '../settings/settings-options';
import { SampleRenderError } from '../sample/sample-render-error';
import type { Favorite } from './types';

type FavoritePreviewProps = {
  favorite: Favorite;
  displayName: string;
  settings: Settings;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  renderError: boolean;
  onRetryRender: () => void;
};

function sampleStyleLabel(style: SampleStyle) {
  if (style === 'shadow') return '輪郭線と影';
  if (style === 'hidden-lines') return '輪郭線（点線）';
  return '輪郭線と薄い陰影';
}

export function FavoritePreview({
  favorite,
  displayName,
  settings,
  canvasRef,
  renderError,
  onRetryRender,
}: FavoritePreviewProps) {
  const prompt = favorite.prompt;
  const selectedLight = LIGHT_DIRECTION_OPTIONS.find(
    ({ value }) => value === prompt.lightDirection,
  );

  return <section className="favorite-preview-panel">
    <div className="favorite-preview-heading">
      <div><p>保存した立体</p><h3>{displayName}</h3></div>
      <small>向き・比率・光源を再現</small>
    </div>
    <div className="favorite-canvas-stage">
      <canvas ref={canvasRef} className="favorite-canvas" aria-label={`お気に入りの${displayName}`} />
      {renderError && <SampleRenderError onRetry={onRetryRender} />}
      {settings.sampleStyle === 'shadow' && selectedLight && (
        <span className="light-direction-badge">
          光源 {selectedLight.label} <b aria-hidden="true">{selectedLight.arrow}</b>
        </span>
      )}
    </div>
    <div className="favorite-meta">
      <span><small>難易度</small><strong>{settings.difficulty === 'hard' ? '難しい' : '簡単'}</strong></span>
      <span><small>練習方法</small><strong>{practiceModeDetails(settings.practiceMode).detailLabel}</strong></span>
      <span><small>見本表示</small><strong>{sampleStyleLabel(settings.sampleStyle)}</strong></span>
      <span><small>表示時間</small><strong>{settings.sampleVisibility === 'partway' ? '途中で隠す' : '常に表示'}</strong></span>
      <span><small>制限時間</small><strong>{settings.time === null ? '指定なし' : `${settings.time}秒`}</strong></span>
    </div>
    <div className="favorite-actions">
      <p>一覧のチェックマークで、練習する立体を選択してください。</p>
    </div>
  </section>;
}
