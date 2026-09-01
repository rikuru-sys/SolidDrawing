import { describe, expect, it, vi } from 'vitest';
import type { ShapePrompt } from '../../domain/prompt/types';
import type { Stroke } from '../drawing/types';
import type { ShapeEvaluation } from '../evaluation/types';
import {
  captureAttempt,
  captureDrawingAssets,
} from './attempt-capture';

const PROMPT: ShapePrompt = {
  id: 'capture-test',
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
};

const STROKES: Stroke[] = [{
  tool: 'pen',
  points: [{ x: 0.2, y: 0.3 }, { x: 0.7, y: 0.8 }],
  width: 3,
  color: '#30322c',
  opacity: 1,
  stabilization: 'low',
}];

const EVALUATION: ShapeEvaluation = {
  score: 80,
  outline: 80,
  angle: 80,
  size: 80,
  proportion: 80,
  alignmentX: 0.1,
  alignmentY: -0.2,
  feedback: '評価済み',
};

describe('attempt capture', () => {
  it('描画画像と中心合わせ済み画像をPNG・SVGで作成する', () => {
    const exportDrawing = vi.fn((offsetX = 0, offsetY = 0) => `png:${offsetX}:${offsetY}`);
    const exportDrawingSvg = vi.fn((strokes: Stroke[], offsetX = 0, offsetY = 0) => (
      `svg:${strokes.length}:${offsetX}:${offsetY}`
    ));

    const assets = captureDrawingAssets({
      practiceMode: 'canvas',
      strokes: STROKES,
      evaluation: EVALUATION,
      exportDrawing,
      exportDrawingSvg,
    });

    expect(assets).toEqual({
      drawingImage: 'png:0:0',
      alignedDrawingImage: 'png:0.1:-0.2',
      drawingSvg: 'svg:1:0:0',
      alignedDrawingSvg: 'svg:1:0.1:-0.2',
    });
    expect(exportDrawing).toHaveBeenCalledTimes(2);
    expect(exportDrawingSvg).toHaveBeenCalledTimes(2);
  });

  it('見本のみ表示では描画画像を作成しない', () => {
    const exportDrawing = vi.fn(() => 'unused');
    const exportDrawingSvg = vi.fn(() => 'unused');

    const assets = captureDrawingAssets({
      practiceMode: 'sample-only',
      strokes: STROKES,
      evaluation: EVALUATION,
      exportDrawing,
      exportDrawingSvg,
    });

    expect(assets).toEqual({
      drawingImage: '',
      alignedDrawingImage: '',
      drawingSvg: '',
      alignedDrawingSvg: '',
    });
    expect(exportDrawing).not.toHaveBeenCalled();
    expect(exportDrawingSvg).not.toHaveBeenCalled();
  });

  it('見本のみ表示の結果データを作成する', () => {
    const toDataURL = vi.fn(() => 'data:image/png;base64,sample');
    const sampleCanvas = { toDataURL } as unknown as HTMLCanvasElement;

    const attempt = captureAttempt({
      prompt: PROMPT,
      sampleCanvas,
      practiceMode: 'sample-only',
      seconds: 30,
      getCurrentStrokes: () => STROKES,
      exportDrawing: () => 'unused',
      exportDrawingSvg: () => 'unused',
    });

    expect(attempt.prompt).toBe(PROMPT);
    expect(attempt.sampleImage).toBe('data:image/png;base64,sample');
    expect(attempt.seconds).toBe(30);
    expect(attempt.practiceMode).toBe('sample-only');
    expect(attempt.drawingImage).toBe('');
    expect(attempt.evaluation.feedback).toContain('自動形状評価を行いません');
    expect(toDataURL).toHaveBeenCalledWith('image/png');
  });
});
