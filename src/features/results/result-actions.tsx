import type { Attempt, ComparisonMode } from './types';

type Props = {
  attempt: Attempt;
  selectedResult: number;
  resultCount: number;
  comparisonMode: ComparisonMode;
  isCurrentFavorite: boolean;
  onSelectResult: (index: number) => void;
  onToggleFavorite: () => void;
  onSaveSample: () => void;
  onSaveComparison: () => void;
  onSaveDrawing: () => void;
  onSaveAllComparisons: (mode: ComparisonMode) => void;
};

export function ResultActions(props: Props) {
  return <div className="comparison-footer">
    <div className="button-row">
      <button className={props.isCurrentFavorite ? 'button favorite selected compact' : 'button favorite compact'} type="button" aria-pressed={props.isCurrentFavorite} onClick={props.onToggleFavorite}>{props.isCurrentFavorite ? '★ お気に入り済み' : '☆ お気に入りに追加'}</button>
      {props.attempt.practiceMode === 'sample-only'
        ? <button className="button primary compact" type="button" onClick={props.onSaveSample}>見本画像を保存</button>
        : <>
          <button className="button secondary compact" type="button" onClick={props.onSaveComparison}>{props.comparisonMode === 'overlay' ? '重ね合わせ画像を保存' : '比較画像を保存'}</button>
          <button className="button secondary compact" type="button" onClick={props.onSaveDrawing}>描画だけ保存</button>
          <button className="button secondary compact" type="button" onClick={() => props.onSaveAllComparisons('side-by-side')}>全結果：横並び保存</button>
          <button className="button primary compact" type="button" onClick={() => props.onSaveAllComparisons('overlay')}>全結果：重ね合わせ保存</button>
        </>}
    </div>
    <div className="button-row">
      <button className="button secondary compact" type="button" disabled={props.selectedResult === 0} onClick={() => props.onSelectResult(props.selectedResult - 1)}>前へ</button>
      <button className="button secondary compact" type="button" disabled={props.selectedResult === props.resultCount - 1} onClick={() => props.onSelectResult(props.selectedResult + 1)}>次へ</button>
    </div>
  </div>;
}
