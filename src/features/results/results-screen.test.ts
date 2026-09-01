import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ComparisonViewer } from './comparison-viewer';
import { ResultActions } from './result-actions';
import { ResultsScreen, type ResultsScreenProps } from './results-screen';
import type { Attempt } from './types';

function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    prompt: {
      id: 'prompt-1',
      shape: '立方体',
      widthScale: 1,
      heightScale: 1,
      depthScale: 1,
      cameraAzimuth: 0.4,
      cameraElevation: 0.3,
      objectRotationX: 0,
      objectRotationY: 0,
      objectRotationZ: 0,
      lightDirection: 'top-left',
      generation: { seed: 12345, version: 1, index: 0 },
    },
    sampleImage: 'sample.png',
    drawingImage: 'drawing.png',
    alignedDrawingImage: 'aligned.png',
    drawingSvg: 'drawing.svg',
    alignedDrawingSvg: 'aligned.svg',
    seconds: 45,
    evaluation: {
      score: 82,
      outline: 80,
      angle: 84,
      size: 86,
      proportion: 78,
      alignmentX: 0,
      alignmentY: 0,
      feedback: '形がよく合っています。',
    },
    practiceMode: 'canvas',
    ...overrides,
  };
}

function renderResults(overrides: Partial<ResultsScreenProps> = {}) {
  const props: ResultsScreenProps = {
    attempts: [attempt()],
    isFavorite: () => false,
    onRetryCurrent: () => undefined,
    onRetrySession: () => undefined,
    onToggleFavorite: () => undefined,
    onBack: () => undefined,
    ...overrides,
  };
  return renderToStaticMarkup(createElement(ResultsScreen, props));
}

describe('ResultsScreen', () => {
  it('renders side-by-side comparison, evaluation, duration, and seed', () => {
    const html = renderResults();

    expect(html).toContain('練習結果');
    expect(html).toContain('合計 00:45');
    expect(html).toContain('シード 12345');
    expect(html).toContain('自動形状評価');
    expect(html).toContain('輪郭</dt><dd>80');
    expect(html).toContain('描画だけ保存');
    expect(html).toContain('トップへ戻る');
    expect(html).toContain('src="drawing.svg"');
  });

  it('renders the aligned SVG and opacity control in overlay mode', () => {
    const html = renderToStaticMarkup(createElement(ComparisonViewer, {
      attempt: attempt(),
      resultNumber: 1,
      mode: 'overlay',
      overlayOpacity: 0.72,
      onModeChange: () => undefined,
      onOverlayOpacityChange: () => undefined,
    }));
    const actionsHtml = renderToStaticMarkup(createElement(ResultActions, {
      attempt: attempt(),
      selectedResult: 0,
      resultCount: 1,
      comparisonMode: 'overlay',
      isCurrentFavorite: false,
      onSelectResult: () => undefined,
      onToggleFavorite: () => undefined,
      onSaveSample: () => undefined,
      onSaveComparison: () => undefined,
      onSaveDrawing: () => undefined,
      onSaveAllComparisons: () => undefined,
    }));

    expect(html).toContain('中心を合わせて見本と描画を比較');
    expect(html).toContain('src="aligned.svg"');
    expect(html).toContain('描画の濃さ 72%');
    expect(actionsHtml).toContain('重ね合わせ画像を保存');
  });

  it('renders sample-only results without drawing evaluation and save controls', () => {
    const html = renderResults({
      attempts: [attempt({ practiceMode: 'sample-only' })],
    });

    expect(html).toContain('見本のみ表示モードの練習記録');
    expect(html).toContain('自動評価なし');
    expect(html).toContain('見本画像を保存');
    expect(html).not.toContain('自動形状評価');
    expect(html).not.toContain('描画だけ保存');
  });

  it('renders nothing when there is no selected attempt', () => {
    expect(renderResults({ attempts: [] })).toBe('');
  });
});
