'use client';

import { useState } from 'react';
import { ComparisonViewer } from './comparison-viewer';
import { EvaluationPanel } from './evaluation-panel';
import { ResultActions } from './result-actions';
import {
  downloadAllAttemptResults,
  downloadAttemptComparison,
  downloadAttemptDrawing,
  downloadAttemptSample,
} from './result-export';
import { ResultNavigation } from './result-navigation';
import { ResultsHeader } from './results-header';
import type { Attempt, ComparisonMode } from './types';

export type ResultsScreenProps = {
  attempts: Attempt[];
  isFavorite: (attempt: Attempt) => boolean;
  onRetryCurrent: (attempt: Attempt) => void;
  onRetrySession: () => void;
  onToggleFavorite: (attempt: Attempt) => void;
  onBack: () => void;
};

export function ResultsScreen(props: ResultsScreenProps) {
  const [selectedResult, setSelectedResult] = useState(() => Math.max(0, props.attempts.length - 1));
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('side-by-side');
  const [overlayOpacity, setOverlayOpacity] = useState(0.72);
  const currentResult = props.attempts[selectedResult];
  if (!currentResult) return null;

  function saveComparison() {
    void downloadAttemptComparison({
      attempt: currentResult,
      index: selectedResult,
      mode: comparisonMode,
      overlayOpacity,
    });
  }

  function saveAllResults() {
    void downloadAllAttemptResults({
      attempts: props.attempts,
    });
  }

  return <section className="results-section">
    <ResultsHeader attempts={props.attempts} onRetryCurrent={() => props.onRetryCurrent(currentResult)} onRetrySession={props.onRetrySession} onBack={props.onBack} />
    <div className="result-layout">
      <ResultNavigation attempts={props.attempts} selectedResult={selectedResult} onSelectResult={setSelectedResult} />
      <section className="comparison-panel">
        <ComparisonViewer attempt={currentResult} resultNumber={selectedResult + 1} mode={comparisonMode} overlayOpacity={overlayOpacity} onModeChange={setComparisonMode} onOverlayOpacityChange={setOverlayOpacity}>
          <EvaluationPanel evaluation={currentResult.evaluation} />
        </ComparisonViewer>
        <ResultActions
          attempt={currentResult}
          selectedResult={selectedResult}
          resultCount={props.attempts.length}
          comparisonMode={comparisonMode}
          isCurrentFavorite={props.isFavorite(currentResult)}
          onSelectResult={setSelectedResult}
          onToggleFavorite={() => props.onToggleFavorite(currentResult)}
          onSaveSample={() => downloadAttemptSample(currentResult, selectedResult)}
          onSaveComparison={saveComparison}
          onSaveDrawing={() => downloadAttemptDrawing(currentResult, selectedResult)}
          onSaveAllResults={saveAllResults}
        />
      </section>
    </div>
  </section>;
}
