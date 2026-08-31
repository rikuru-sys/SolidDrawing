'use client';

import { ComparisonViewer } from './comparison-viewer';
import { EvaluationPanel } from './evaluation-panel';
import { ResultActions } from './result-actions';
import { ResultNavigation } from './result-navigation';
import { ResultsHeader } from './results-header';
import type { Attempt, ComparisonMode } from './types';

export type ResultsScreenProps = {
  attempts: Attempt[];
  selectedResult: number;
  comparisonMode: ComparisonMode;
  overlayOpacity: number;
  isCurrentFavorite: boolean;
  onSelectResult: (index: number) => void;
  onComparisonModeChange: (mode: ComparisonMode) => void;
  onOverlayOpacityChange: (opacity: number) => void;
  onRetryCurrent: () => void;
  onRetrySession: () => void;
  onToggleFavorite: () => void;
  onSaveSample: () => void;
  onSaveComparison: () => void;
  onSaveDrawing: () => void;
  onSaveAllComparisons: (mode: ComparisonMode) => void;
};

export function ResultsScreen(props: ResultsScreenProps) {
  const currentResult = props.attempts[props.selectedResult];
  if (!currentResult) return null;
  return <section className="results-section">
    <ResultsHeader attempts={props.attempts} onRetryCurrent={props.onRetryCurrent} onRetrySession={props.onRetrySession} />
    <div className="result-layout">
      <ResultNavigation attempts={props.attempts} selectedResult={props.selectedResult} onSelectResult={props.onSelectResult} />
      <section className="comparison-panel">
        <ComparisonViewer attempt={currentResult} resultNumber={props.selectedResult + 1} mode={props.comparisonMode} overlayOpacity={props.overlayOpacity} onModeChange={props.onComparisonModeChange} onOverlayOpacityChange={props.onOverlayOpacityChange}>
          {currentResult.practiceMode === 'canvas' && <EvaluationPanel evaluation={currentResult.evaluation} />}
        </ComparisonViewer>
        <ResultActions
          attempt={currentResult}
          selectedResult={props.selectedResult}
          resultCount={props.attempts.length}
          comparisonMode={props.comparisonMode}
          isCurrentFavorite={props.isCurrentFavorite}
          onSelectResult={props.onSelectResult}
          onToggleFavorite={props.onToggleFavorite}
          onSaveSample={props.onSaveSample}
          onSaveComparison={props.onSaveComparison}
          onSaveDrawing={props.onSaveDrawing}
          onSaveAllComparisons={props.onSaveAllComparisons}
        />
      </section>
    </div>
  </section>;
}
