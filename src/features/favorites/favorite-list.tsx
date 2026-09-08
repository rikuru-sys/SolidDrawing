import type { FavoriteListItem } from './favorite-list-item';

type FavoriteListProps = {
  items: FavoriteListItem[];
  selectedPromptKeys: ReadonlySet<string>;
  onTogglePracticeSelection: (promptKey: string) => void;
  onDeleteFavorite: (item: FavoriteListItem) => void;
};

export function FavoriteList({
  items,
  selectedPromptKeys,
  onTogglePracticeSelection,
  onDeleteFavorite,
}: FavoriteListProps) {
  return <div className="favorite-list" role="group" aria-label="保存した立体">
    {items.map((item) => (
      <div
        key={item.promptKey}
        className={selectedPromptKeys.has(item.promptKey) ? 'favorite-item selected' : 'favorite-item'}
      >
        <label className="favorite-item-select">
          <input
            type="checkbox"
            aria-label={`${item.displayName}を練習対象に選択`}
            checked={selectedPromptKeys.has(item.promptKey)}
            onChange={() => onTogglePracticeSelection(item.promptKey)}
          />
          <span className="favorite-item-content">
            <strong>★ {item.displayName}</strong>
            <span>向き・比率を保存</span>
          </span>
        </label>
        <button
          className="text-button danger favorite-item-delete"
          type="button"
          aria-label={`${item.displayName}を削除`}
          onClick={() => onDeleteFavorite(item)}
        >
          削除
        </button>
      </div>
    ))}
  </div>;
}
