import { usesDrawingCanvas } from '../settings/practice-mode';
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
  onSaveAllResults: () => void;
};

export function ResultActions(props: Props) {
  const hasDrawingCanvas = usesDrawingCanvas(props.attempt.practiceMode);
  return <div className="comparison-footer">
    <div className="button-row">
      <button className={props.isCurrentFavorite ? 'button favorite selected compact' : 'button favorite compact'} type="button" aria-pressed={props.isCurrentFavorite} onClick={props.onToggleFavorite}>{props.isCurrentFavorite ? '★ お気に入り済み' : '☆ お気に入りに追加'}</button>
      {hasDrawingCanvas
        ? <>
          <button className="button secondary compact" type="button" onClick={props.onSaveComparison}>{props.comparisonMode === 'overlay' ? '重ね合わせ画像を保存' : '比較画像を保存'}</button>
          <button className="button secondary compact" type="button" onClick={props.onSaveDrawing}>描画だけ保存</button>
          <button className="button primary compact" type="button" onClick={props.onSaveAllResults}>全結果を保存</button>
        </>
        : <button className="button primary compact" type="button" onClick={props.onSaveSample}>見本画像を保存</button>}
    </div>
    <div className="button-row">
      <button className="button secondary compact" type="button" disabled={props.selectedResult === 0} onClick={() => props.onSelectResult(props.selectedResult - 1)}>前へ</button>
      <button className="button secondary compact" type="button" disabled={props.selectedResult === props.resultCount - 1} onClick={() => props.onSelectResult(props.selectedResult + 1)}>次へ</button>
    </div>
  </div>;
}
