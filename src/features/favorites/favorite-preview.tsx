import type { RefObject } from 'react';
import { practiceModeDetails } from '../settings/practice-mode';
import type { SampleStyle } from '../settings/practice-settings';
import { LIGHT_DIRECTION_OPTIONS } from '../settings/settings-options';
import type { Favorite } from './types';

type FavoritePreviewProps = {
  favorite: Favorite;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onPractice: () => void;
  onDelete: () => void;
};

function sampleStyleLabel(style: SampleStyle) {
  if (style === 'shadow') return '輪郭線と影';
  if (style === 'hidden-lines') return '輪郭線（点線）';
  return '輪郭線と薄い陰影';
}

export function FavoritePreview({
  favorite,
  canvasRef,
  onPractice,
  onDelete,
}: FavoritePreviewProps) {
  const selectedLight = LIGHT_DIRECTION_OPTIONS.find(
    ({ value }) => value === favorite.prompt.lightDirection,
  );

  return <section className="favorite-preview-panel">
    <div className="favorite-preview-heading">
      <div><p>保存した見本</p><h3>{favorite.prompt.shape}</h3></div>
      <small>{new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date(favorite.createdAt))}に追加</small>
    </div>
    <div className="favorite-canvas-stage">
      <canvas ref={canvasRef} className="favorite-canvas" aria-label={`お気に入りの${favorite.prompt.shape}`} />
      {favorite.settings.sampleStyle === 'shadow' && selectedLight && (
        <span className="light-direction-badge">
          光源 {selectedLight.label} <b aria-hidden="true">{selectedLight.arrow}</b>
        </span>
      )}
    </div>
    <div className="favorite-meta">
      <span><small>難易度</small><strong>{favorite.settings.difficulty === 'hard' ? '難しい' : '簡単'}</strong></span>
      <span><small>練習方法</small><strong>{practiceModeDetails(favorite.settings.practiceMode).detailLabel}</strong></span>
      <span><small>見本表示</small><strong>{sampleStyleLabel(favorite.settings.sampleStyle)}</strong></span>
      <span><small>表示時間</small><strong>{favorite.settings.sampleVisibility === 'partway' ? '途中で隠す' : '常に表示'}</strong></span>
      <span><small>制限時間</small><strong>{favorite.settings.time === null ? '指定なし' : `${favorite.settings.time}秒`}</strong></span>
    </div>
    <div className="favorite-actions">
      <button className="button primary" type="button" onClick={onPractice}>この見本でもう一度</button>
      <button className="text-button danger" type="button" onClick={onDelete}>お気に入りから削除</button>
    </div>
  </section>;
}
