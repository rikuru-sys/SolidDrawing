'use client';

/* eslint-disable @next/next/no-img-element -- comparison images are generated data URLs */

import { formatTimerSeconds } from '../practice/practice-timer';
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

export function ResultsScreen({
  attempts,
  selectedResult,
  comparisonMode,
  overlayOpacity,
  isCurrentFavorite,
  onSelectResult,
  onComparisonModeChange,
  onOverlayOpacityChange,
  onRetryCurrent,
  onRetrySession,
  onToggleFavorite,
  onSaveSample,
  onSaveComparison,
  onSaveDrawing,
  onSaveAllComparisons,
}: ResultsScreenProps) {
  const currentResult = attempts[selectedResult];
  if (!currentResult) return null;

  const sessionSeconds = attempts.reduce((total, attempt) => total + attempt.seconds, 0);
  const resultSeed = attempts[0]?.prompt.generation?.seed;

  return (
    <section className="results-section">
      <div className="results-heading">
        <div>
          <h2>練習結果</h2>
          <div className="result-meta">
            <span>{attempts.length}回完了</span>
            <span>合計 {formatTimerSeconds(sessionSeconds)}</span>
            {resultSeed !== undefined && <span>シード {resultSeed}</span>}
            <span>{new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date())}</span>
          </div>
        </div>
        <div className="button-row">
          <button className="button secondary" type="button" onClick={onRetryCurrent}>今回と同じ立体でもう一度</button>
          <button className="button primary" type="button" onClick={onRetrySession}>同じ設定でもう一度</button>
        </div>
      </div>
      <div className="result-layout">
        <nav className="result-list" aria-label="確認する問題">
          {attempts.map((attempt, index) => (
            <button
              key={attempt.prompt.id}
              className={selectedResult === index ? 'result-item selected' : 'result-item'}
              type="button"
              aria-pressed={selectedResult === index}
              onClick={() => onSelectResult(index)}
            >
              <strong>{index + 1}　{attempt.prompt.shape}</strong>
              <span>{attempt.seconds}秒・{attempt.practiceMode === 'sample-only' ? '見本のみ' : `評価 ${attempt.evaluation.score}点`}</span>
            </button>
          ))}
        </nav>
        <section className="comparison-panel">
          <div className="comparison-heading">
            <div className="comparison-title">
              <h3>{selectedResult + 1}　{currentResult.prompt.shape}</h3>
              <span>{currentResult.practiceMode === 'sample-only'
                ? '見本のみ表示モードの練習記録'
                : comparisonMode === 'overlay'
                  ? '中心を合わせて見本と描画を比較'
                  : '見本と描画を横並びで比較'}</span>
            </div>
            {currentResult.practiceMode === 'canvas' && (
              <div className="comparison-mode-buttons" role="group" aria-label="比較方法">
                <button
                  className={comparisonMode === 'side-by-side' ? 'selected' : ''}
                  type="button"
                  aria-pressed={comparisonMode === 'side-by-side'}
                  onClick={() => onComparisonModeChange('side-by-side')}
                >横並び</button>
                <button
                  className={comparisonMode === 'overlay' ? 'selected' : ''}
                  type="button"
                  aria-pressed={comparisonMode === 'overlay'}
                  onClick={() => onComparisonModeChange('overlay')}
                >重ね合わせ</button>
              </div>
            )}
          </div>
          <div className={currentResult.practiceMode === 'sample-only'
            ? 'comparison-body sample-only-result-body'
            : 'comparison-body'}>
            <div className="comparison-visual">
              {currentResult.practiceMode === 'sample-only' ? (
                <>
                  <div className="comparison-panes sample-only-result">
                    <figure className="compare-pane">
                      <figcaption>見本</figcaption>
                      <div><img src={currentResult.sampleImage} alt={`${currentResult.prompt.shape}の見本`} /></div>
                    </figure>
                  </div>
                  <div className="sample-only-result-note">
                    <strong>自動評価なし</strong>
                    <span>外部のペイントソフトで描いた結果はこのサイトには保存されないため、形状評価は行いません。</span>
                  </div>
                </>
              ) : comparisonMode === 'overlay' ? (
                <div className="overlay-comparison">
                  <div className="overlay-stage">
                    <img src={currentResult.sampleImage} alt={`${currentResult.prompt.shape}の見本`} />
                    <img
                      className="overlay-drawing"
                      src={currentResult.alignedDrawingSvg}
                      alt={`${currentResult.prompt.shape}を描いた結果の重ね合わせ`}
                      style={{ opacity: overlayOpacity }}
                    />
                  </div>
                  <label className="overlay-opacity-control">
                    <span>描画の濃さ {Math.round(overlayOpacity * 100)}%</span>
                    <input
                      type="range"
                      min="0.2"
                      max="1"
                      step="0.05"
                      value={overlayOpacity}
                      onChange={(event) => onOverlayOpacityChange(Number(event.target.value))}
                      aria-label="重ね合わせる描画の濃さ"
                    />
                  </label>
                </div>
              ) : (
                <div className="comparison-panes">
                  <figure className="compare-pane">
                    <figcaption>見本</figcaption>
                    <div><img src={currentResult.sampleImage} alt={`${currentResult.prompt.shape}の見本`} /></div>
                  </figure>
                  <figure className="compare-pane">
                    <figcaption>描いたもの</figcaption>
                    <div><img src={currentResult.drawingSvg} alt={`${currentResult.prompt.shape}を描いた結果`} /></div>
                  </figure>
                </div>
              )}
            </div>
            {currentResult.practiceMode === 'canvas' && (
              <div className={`evaluation-summary ${currentResult.evaluation.score >= 80 ? 'high' : currentResult.evaluation.score >= 60 ? 'medium' : 'low'}`}>
                <div className="evaluation-score"><strong>{currentResult.evaluation.score}</strong><span>点</span></div>
                <div className="evaluation-copy">
                  <strong>自動形状評価</strong>
                  <p>{currentResult.evaluation.feedback}</p>
                  <small>位置だけを合わせ、輪郭45%・傾き25%・大きさ20%・比率10%で細かなずれも評価します。</small>
                </div>
                <dl className="evaluation-metrics">
                  <div><dt>輪郭</dt><dd>{currentResult.evaluation.outline}</dd></div>
                  <div><dt>傾き</dt><dd>{currentResult.evaluation.angle}</dd></div>
                  <div><dt>大きさ</dt><dd>{currentResult.evaluation.size}</dd></div>
                  <div><dt>比率</dt><dd>{currentResult.evaluation.proportion}</dd></div>
                </dl>
              </div>
            )}
          </div>
          <div className="comparison-footer">
            <div className="button-row">
              <button
                className={isCurrentFavorite ? 'button favorite selected compact' : 'button favorite compact'}
                type="button"
                aria-pressed={isCurrentFavorite}
                onClick={onToggleFavorite}
              >{isCurrentFavorite ? '★ お気に入り済み' : '☆ お気に入りに追加'}</button>
              {currentResult.practiceMode === 'sample-only' ? (
                <button className="button primary compact" type="button" onClick={onSaveSample}>見本画像を保存</button>
              ) : (
                <>
                  <button className="button secondary compact" type="button" onClick={onSaveComparison}>{comparisonMode === 'overlay' ? '重ね合わせ画像を保存' : '比較画像を保存'}</button>
                  <button className="button secondary compact" type="button" onClick={onSaveDrawing}>描画だけ保存</button>
                  <button className="button secondary compact" type="button" onClick={() => onSaveAllComparisons('side-by-side')}>全結果：横並び保存</button>
                  <button className="button primary compact" type="button" onClick={() => onSaveAllComparisons('overlay')}>全結果：重ね合わせ保存</button>
                </>
              )}
            </div>
            <div className="button-row">
              <button
                className="button secondary compact"
                type="button"
                disabled={selectedResult === 0}
                onClick={() => onSelectResult(selectedResult - 1)}
              >前へ</button>
              <button
                className="button secondary compact"
                type="button"
                disabled={selectedResult === attempts.length - 1}
                onClick={() => onSelectResult(selectedResult + 1)}
              >次へ</button>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
