type FavoriteEmptyStateProps = {
  onStartPractice: () => void;
};

export function FavoriteEmptyState({ onStartPractice }: FavoriteEmptyStateProps) {
  return <div className="favorite-empty">
    <span aria-hidden="true">☆</span>
    <h3>お気に入りはまだありません</h3>
    <p>練習結果の比較画面から、向きや比率を残したい立体を保存できます。</p>
    <button className="button primary" type="button" onClick={onStartPractice}>練習を始める</button>
  </div>;
}
