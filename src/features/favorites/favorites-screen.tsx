'use client';

import { useSampleCanvas } from '../sample/use-sample-canvas';
import { FavoriteEmptyState } from './favorite-empty-state';
import { FavoriteList } from './favorite-list';
import { FavoritePreview } from './favorite-preview';
import type { Favorite } from './types';

export type FavoritesScreenProps = {
  favorites: Favorite[];
  selectedFavorite: Favorite | null;
  onSelectFavorite: (id: string) => void;
  onPracticeFavorite: (favorite: Favorite) => void;
  onDeleteFavorite: () => void;
  onStartPractice: () => void;
  onBack: () => void;
};

export function FavoritesScreen({
  favorites,
  selectedFavorite,
  onSelectFavorite,
  onPracticeFavorite,
  onDeleteFavorite,
  onStartPractice,
  onBack,
}: FavoritesScreenProps) {
  const { canvasRef, renderError, retryRender } = useSampleCanvas({
    active: selectedFavorite !== null,
    prompt: selectedFavorite?.sample.prompt,
    style: selectedFavorite?.savedPractice.settings.sampleStyle,
  });

  function deleteFavorite() {
    if (window.confirm('選択中の見本をお気に入りから削除しますか？')) {
      onDeleteFavorite();
    }
  }

  return (
    <section className="favorites-section">
      <div className="section-heading">
        <div><h1>お気に入り</h1><p>保存した見本を確認し、同じ立体でもう一度練習できます。</p></div>
        <button className="text-button" type="button" onClick={onBack}>トップへ戻る</button>
      </div>
      {selectedFavorite ? (
        <div className="favorite-layout">
          <FavoriteList
            favorites={favorites}
            selectedFavoriteId={selectedFavorite.id}
            onSelectFavorite={onSelectFavorite}
          />
          <FavoritePreview
            favorite={selectedFavorite}
            canvasRef={canvasRef}
            renderError={renderError}
            onRetryRender={retryRender}
            onPractice={() => onPracticeFavorite(selectedFavorite)}
            onDelete={deleteFavorite}
          />
        </div>
      ) : (
        <FavoriteEmptyState onStartPractice={onStartPractice} />
      )}
    </section>
  );
}
