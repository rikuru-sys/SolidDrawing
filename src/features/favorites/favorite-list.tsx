import { practiceModeDetails } from '../settings/practice-mode';
import type { Favorite } from './types';

type FavoriteListProps = {
  favorites: Favorite[];
  selectedFavoriteId: string;
  onSelectFavorite: (id: string) => void;
};

export function FavoriteList({
  favorites,
  selectedFavoriteId,
  onSelectFavorite,
}: FavoriteListProps) {
  return <nav className="favorite-list" aria-label="保存した見本">
    {favorites.map((favorite) => (
      <button
        key={favorite.id}
        className={selectedFavoriteId === favorite.id ? 'favorite-item selected' : 'favorite-item'}
        type="button"
        aria-pressed={selectedFavoriteId === favorite.id}
        onClick={() => onSelectFavorite(favorite.id)}
      >
        <strong>★ {favorite.sample.prompt.shape}</strong>
        <span>{favorite.savedPractice.settings.difficulty === 'hard' ? '難しい' : '簡単'}・{practiceModeDetails(favorite.savedPractice.settings.practiceMode).compactLabel}・{favorite.savedPractice.settings.time === null ? '時間指定なし' : `${favorite.savedPractice.settings.time}秒`}</span>
      </button>
    ))}
  </nav>;
}
