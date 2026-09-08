'use client';

import { useState } from 'react';
import type { Settings } from '../settings/practice-settings';
import { useSampleCanvas } from '../sample/use-sample-canvas';
import { FavoriteEmptyState } from './favorite-empty-state';
import { FavoriteList } from './favorite-list';
import { createFavoriteListItems, type FavoriteListItem } from './favorite-list-item';
import { FavoritePreview } from './favorite-preview';
import type { Favorite } from './types';
import { createPromptIdentity } from './prompt-identity';

export type FavoritesScreenProps = {
  favorites: Favorite[];
  selectedFavorite: Favorite | null;
  settings: Settings;
  onSelectFavorite: (promptKey: string) => void;
  onPracticeFavorites: (favorites: Favorite[]) => void;
  onDeleteFavorite: (promptKey: string) => void;
  onStartPractice: () => void;
  onBack: () => void;
};

export function FavoritesScreen({
  favorites,
  selectedFavorite,
  settings,
  onSelectFavorite,
  onPracticeFavorites,
  onDeleteFavorite,
  onStartPractice,
  onBack,
}: FavoritesScreenProps) {
  const [practiceSelection, setPracticeSelection] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const { canvasRef, renderError, retryRender } = useSampleCanvas({
    active: selectedFavorite !== null,
    prompt: selectedFavorite?.prompt,
    style: settings.sampleStyle,
  });
  const favoriteItems = createFavoriteListItems(favorites);
  const selectedPromptKey = selectedFavorite
    ? createPromptIdentity(selectedFavorite.prompt)
    : null;
  const selectedItem = favoriteItems.find(({ promptKey }) => promptKey === selectedPromptKey)
    ?? favoriteItems[0];
  const selectedForPractice = favoriteItems
    .filter(({ promptKey }) => practiceSelection.has(promptKey))
    .map(({ favorite }) => favorite);

  function togglePracticeSelection(promptKey: string) {
    onSelectFavorite(promptKey);
    setPracticeSelection((current) => {
      const next = new Set(current);
      if (next.has(promptKey)) next.delete(promptKey);
      else next.add(promptKey);
      return next;
    });
  }

  function deleteFavorite(item: FavoriteListItem) {
    if (!window.confirm(`${item.displayName}をお気に入りから削除しますか？`)) return;

    onDeleteFavorite(item.promptKey);
    setPracticeSelection((current) => {
      const next = new Set(current);
      next.delete(item.promptKey);
      return next;
    });
  }

  return (
    <section className="favorites-section">
      <div className="section-heading">
        <div><h1>お気に入り</h1><p>立体の向き・比率・光源を保存し、現在の練習設定で繰り返し練習できます。</p></div>
        <button className="text-button" type="button" onClick={onBack}>トップへ戻る</button>
      </div>
      {selectedFavorite ? (
        <div className="favorite-layout">
          <div className="favorite-list-column">
            <FavoriteList
              items={favoriteItems}
              selectedPromptKeys={practiceSelection}
              onTogglePracticeSelection={togglePracticeSelection}
              onDeleteFavorite={deleteFavorite}
            />
            <button
              className="button primary favorite-practice-button"
              type="button"
              disabled={selectedForPractice.length === 0}
              onClick={() => onPracticeFavorites(selectedForPractice)}
            >
              選択した立体を現在の設定で練習（{selectedForPractice.length}件）
            </button>
          </div>
          <FavoritePreview
            favorite={selectedFavorite}
            displayName={selectedItem.displayName}
            settings={settings}
            canvasRef={canvasRef}
            renderError={renderError}
            onRetryRender={retryRender}
          />
        </div>
      ) : (
        <FavoriteEmptyState onStartPractice={onStartPractice} />
      )}
    </section>
  );
}
