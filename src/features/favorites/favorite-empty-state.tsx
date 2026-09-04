type FavoriteEmptyStateProps = {
  onStartPractice: () => void;
};

export function FavoriteEmptyState({ onStartPractice }: FavoriteEmptyStateProps) {
  return <div className="favorite-empty">
    <span aria-hidden="true">☆</span>
    <h3>お気に入りはまだありません</h3>
    <p>練習結果の比較画面から、気に入った見本を保存できます。</p>
    <button className="button primary" type="button" onClick={onStartPractice}>練習を始める</button>
  </div>;
}
