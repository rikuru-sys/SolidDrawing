'use client';

import type { Settings } from '../settings/practice-settings';
import { useSampleCanvas } from '../sample/use-sample-canvas';
import { FavoriteEmptyState } from './favorite-empty-state';
import { FavoriteList } from './favorite-list';
import { FavoritePreview } from './favorite-preview';
import type { Favorite } from './types';
import { createPromptIdentity } from './prompt-identity';

export type FavoritesScreenProps = {
  favorites: Favorite[];
  selectedFavorite: Favorite | null;
  settings: Settings;
  onSelectFavorite: (promptKey: string) => void;
  onPracticeFavorite: (favorite: Favorite) => void;
  onDeleteFavorite: () => void;
  onStartPractice: () => void;
  onBack: () => void;
};

export function FavoritesScreen({
  favorites,
  selectedFavorite,
  settings,
  onSelectFavorite,
  onPracticeFavorite,
  onDeleteFavorite,
  onStartPractice,
  onBack,
}: FavoritesScreenProps) {
  const { canvasRef, renderError, retryRender } = useSampleCanvas({
    active: selectedFavorite !== null,
    prompt: selectedFavorite?.prompt,
    style: settings.sampleStyle,
  });

  function deleteFavorite() {
    if (window.confirm('選択中の立体をお気に入りから削除しますか？')) {
      onDeleteFavorite();
    }
  }

  return (
    <section className="favorites-section">
      <div className="section-heading">
        <div><h1>お気に入り</h1><p>立体の向き・比率・光源を保存し、現在の練習設定で繰り返し練習できます。</p></div>
        <button className="text-button" type="button" onClick={onBack}>トップへ戻る</button>
      </div>
      {selectedFavorite ? (
        <div className="favorite-layout">
          <FavoriteList
            favorites={favorites}
            selectedPromptKey={createPromptIdentity(selectedFavorite.prompt)}
            onSelectFavorite={onSelectFavorite}
          />
          <FavoritePreview
            favorite={selectedFavorite}
            settings={settings}
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
