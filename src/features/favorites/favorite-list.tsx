import type { Favorite } from './types';
import { createPromptIdentity } from './prompt-identity';

type FavoriteListProps = {
  favorites: Favorite[];
  selectedPromptKey: string;
  onSelectFavorite: (promptKey: string) => void;
};

export function FavoriteList({
  favorites,
  selectedPromptKey,
  onSelectFavorite,
}: FavoriteListProps) {
  return <nav className="favorite-list" aria-label="保存した立体">
    {favorites.map((favorite) => {
      const promptKey = createPromptIdentity(favorite.prompt);
      return (
        <button
          key={promptKey}
          className={selectedPromptKey === promptKey ? 'favorite-item selected' : 'favorite-item'}
          type="button"
          aria-pressed={selectedPromptKey === promptKey}
          onClick={() => onSelectFavorite(promptKey)}
        >
          <strong>★ {favorite.prompt.shape}</strong>
          <span>向き・比率・光源を保存</span>
        </button>
      );
    })}
  </nav>;
}
