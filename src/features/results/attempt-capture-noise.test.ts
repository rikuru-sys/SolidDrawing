import { describe, expect, it, vi } from 'vitest';
import type { Stroke } from '../drawing/types';
import type { ShapeEvaluation } from '../evaluation/types';
import { captureDrawingAssets } from './attempt-capture';

const mainStroke: Stroke = {
  tool: 'pen',
  points: [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.8 }],
  width: 3,
  color: '#30322c',
  opacity: 1,
  stabilization: 'off',
};

const noiseStroke: Stroke = {
  ...mainStroke,
  points: [{ x: 0.95, y: 0.05 }],
};

const evaluation: ShapeEvaluation = {
  score: 80,
  outline: 80,
  angle: 80,
  size: 80,
  proportion: 80,
  shadow: null,
  alignmentX: 0.1,
  alignmentY: -0.2,
  feedback: '評価済み',
};

describe('captureDrawingAssetsのゴミ線除外', () => {
  it('通常表示には全ストロークを残し、重ね合わせには除外済みストロークを使う', () => {
    const allStrokes = [mainStroke, noiseStroke];
    const exportDrawingSvg = vi.fn((strokes: Stroke[]) => `svg:${strokes.length}`);

    captureDrawingAssets({
      practiceMode: 'canvas',
      strokes: allStrokes,
      alignedStrokes: [mainStroke],
      evaluation,
      exportDrawing: () => 'png',
      exportDrawingSvg,
    });

    expect(exportDrawingSvg).toHaveBeenNthCalledWith(1, allStrokes);
    expect(exportDrawingSvg).toHaveBeenNthCalledWith(2, [mainStroke], 0.1, -0.2);
  });
});
