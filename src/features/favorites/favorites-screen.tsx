'use client';

import type { RefObject } from 'react';
import { practiceModeDetails } from '../settings/practice-mode';
import type { SampleStyle } from '../settings/practice-settings';
import { LIGHT_DIRECTION_OPTIONS } from '../settings/settings-options';
import type { Favorite } from './types';

export type FavoritesScreenProps = {
  favorites: Favorite[];
  selectedFavorite: Favorite | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onSelectFavorite: (id: string) => void;
  onPracticeFavorite: (favorite: Favorite) => void;
  onDeleteFavorite: () => void;
  onStartPractice: () => void;
  onBack: () => void;
};

function sampleStyleLabel(style: SampleStyle) {
  if (style === 'shadow') return '輪郭線と影';
  if (style === 'hidden-lines') return '輪郭線（点線）';
  return '輪郭線と薄い陰影';
}

export function FavoritesScreen({
  favorites,
  selectedFavorite,
  canvasRef,
  onSelectFavorite,
  onPracticeFavorite,
  onDeleteFavorite,
  onStartPractice,
  onBack,
}: FavoritesScreenProps) {
  const selectedFavoriteLight = selectedFavorite
    ? LIGHT_DIRECTION_OPTIONS.find(({ value }) => value === selectedFavorite.prompt.lightDirection)
    : undefined;

  return (
    <section className="favorites-section">
      <div className="section-heading">
        <div><h2>お気に入り</h2><p>保存した見本を確認し、同じ立体でもう一度練習できます。</p></div>
        <button className="text-button" type="button" onClick={onBack}>トップへ戻る</button>
      </div>
      {selectedFavorite ? (
        <div className="favorite-layout">
          <nav className="favorite-list" aria-label="保存した見本">
            {favorites.map((favorite) => (
              <button
                key={favorite.id}
                className={selectedFavorite.id === favorite.id ? 'favorite-item selected' : 'favorite-item'}
                type="button"
                aria-pressed={selectedFavorite.id === favorite.id}
                onClick={() => onSelectFavorite(favorite.id)}
              >
                <strong>★ {favorite.prompt.shape}</strong>
                <span>{favorite.settings.difficulty === 'hard' ? '難しい' : '簡単'}・{practiceModeDetails(favorite.settings.practiceMode).compactLabel}・{favorite.settings.time === null ? '時間指定なし' : `${favorite.settings.time}秒`}</span>
              </button>
            ))}
          </nav>
          <section className="favorite-preview-panel">
            <div className="favorite-preview-heading">
              <div><p>保存した見本</p><h3>{selectedFavorite.prompt.shape}</h3></div>
              <small>{new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date(selectedFavorite.createdAt))}に追加</small>
            </div>
            <div className="favorite-canvas-stage">
              <canvas ref={canvasRef} className="favorite-canvas" aria-label={`お気に入りの${selectedFavorite.prompt.shape}`} />
              {selectedFavorite.settings.sampleStyle === 'shadow' && selectedFavoriteLight && (
                <span className="light-direction-badge">
                  光源 {selectedFavoriteLight.label} <b aria-hidden="true">{selectedFavoriteLight.arrow}</b>
                </span>
              )}
            </div>
            <div className="favorite-meta">
              <span><small>難易度</small><strong>{selectedFavorite.settings.difficulty === 'hard' ? '難しい' : '簡単'}</strong></span>
              <span><small>練習方法</small><strong>{practiceModeDetails(selectedFavorite.settings.practiceMode).detailLabel}</strong></span>
              <span><small>見本表示</small><strong>{sampleStyleLabel(selectedFavorite.settings.sampleStyle)}</strong></span>
              <span><small>表示時間</small><strong>{selectedFavorite.settings.sampleVisibility === 'partway' ? '途中で隠す' : '常に表示'}</strong></span>
              <span><small>制限時間</small><strong>{selectedFavorite.settings.time === null ? '指定なし' : `${selectedFavorite.settings.time}秒`}</strong></span>
            </div>
            <div className="favorite-actions">
              <button className="button primary" type="button" onClick={() => onPracticeFavorite(selectedFavorite)}>この見本でもう一度</button>
              <button className="text-button danger" type="button" onClick={onDeleteFavorite}>お気に入りから削除</button>
            </div>
          </section>
        </div>
      ) : (
        <div className="favorite-empty">
          <span aria-hidden="true">☆</span>
          <h3>お気に入りはまだありません</h3>
          <p>練習結果の比較画面から、気に入った見本を保存できます。</p>
          <button className="button primary" type="button" onClick={onStartPractice}>練習を始める</button>
        </div>
      )}
    </section>
  );
}
