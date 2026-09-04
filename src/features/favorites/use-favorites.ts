'use client';

import { useCallback, useState } from 'react';
import type { Attempt } from '../results/types';
import type { Settings } from '../settings/practice-settings';
import { useStoredState } from '../../shared/storage/use-stored-state';
import { readStoredFavorites, saveStoredFavorites } from './favorite-storage';
import type { Favorite } from './types';

function createFavorite(attempt: Attempt, settings: Settings): Favorite {
  return {
    id: `favorite-${attempt.prompt.id}`,
    prompt: { ...attempt.prompt },
    settings: {
      ...settings,
      shapes: [...settings.shapes],
      lightDirections: [...settings.lightDirections],
    },
    createdAt: Date.now(),
  };
}

/** お気に入りの保存、選択、追加、削除を管理する。 */
export function useFavorites(practiceSettings: Settings) {
  const [favorites, setFavorites] = useStoredState(
    readStoredFavorites,
    saveStoredFavorites,
  );
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string | null>(null);
  const selectedFavorite = favorites.find(({ id }) => id === selectedFavoriteId)
    ?? favorites[0]
    ?? null;

  const isFavorite = useCallback((attempt: Attempt) => (
    favorites.some(({ prompt }) => prompt.id === attempt.prompt.id)
  ), [favorites]);

  const toggleFavorite = useCallback((attempt: Attempt) => {
    setFavorites((current) => {
      const exists = current.some(({ prompt }) => prompt.id === attempt.prompt.id);
      return exists
        ? current.filter(({ prompt }) => prompt.id !== attempt.prompt.id)
        : [createFavorite(attempt, practiceSettings), ...current];
    });
  }, [practiceSettings, setFavorites]);

  const deleteSelectedFavorite = useCallback(() => {
    if (!selectedFavorite) return;
    setFavorites((current) => current.filter(({ id }) => id !== selectedFavorite.id));
    setSelectedFavoriteId(null);
  }, [selectedFavorite, setFavorites]);

  return {
    favorites,
    selectedFavorite,
    selectFavorite: setSelectedFavoriteId,
    isFavorite,
    toggleFavorite,
    deleteSelectedFavorite,
  };
}
