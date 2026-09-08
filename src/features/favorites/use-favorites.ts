'use client';

import { useCallback, useState } from 'react';
import type { Attempt } from '../results/types';
import { useStoredState } from '../../shared/storage/use-stored-state';
import { readStoredFavorites, saveStoredFavorites } from './favorite-storage';
import { createPromptIdentity } from './prompt-identity';

/** お気に入りの保存、選択、追加、削除を管理する。 */
export function useFavorites() {
  const [favorites, setFavorites] = useStoredState(
    readStoredFavorites,
    saveStoredFavorites,
  );
  const [selectedPromptKey, setSelectedPromptKey] = useState<string | null>(null);
  const selectedFavorite = favorites.find(({ prompt }) => (
    createPromptIdentity(prompt) === selectedPromptKey
  ))
    ?? favorites[0]
    ?? null;

  const isFavorite = useCallback((attempt: Attempt) => (
    favorites.some(({ prompt }) => (
      createPromptIdentity(prompt) === createPromptIdentity(attempt.prompt)
    ))
  ), [favorites]);

  const toggleFavorite = useCallback((attempt: Attempt) => {
    setFavorites((current) => {
      const promptKey = createPromptIdentity(attempt.prompt);
      const exists = current.some((favorite) => (
        createPromptIdentity(favorite.prompt) === promptKey
      ));
      return exists
        ? current.filter((favorite) => createPromptIdentity(favorite.prompt) !== promptKey)
        : [{ prompt: { ...attempt.prompt } }, ...current];
    });
  }, [setFavorites]);

  const deleteFavorite = useCallback((promptKey: string) => {
    setFavorites((current) => current.filter(({ prompt }) => (
      createPromptIdentity(prompt) !== promptKey
    )));
    setSelectedPromptKey((current) => current === promptKey ? null : current);
  }, [setFavorites]);

  return {
    favorites,
    selectedFavorite,
    selectFavorite: setSelectedPromptKey,
    isFavorite,
    toggleFavorite,
    deleteFavorite,
  };
}
