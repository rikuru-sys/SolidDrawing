import { describe, expect, it } from 'vitest';
import {
  calculateStrokeLength,
  normalizeCanvasPoint,
} from './drawing-canvas-renderer';

describe('描画Canvasの座標変換', () => {
  const bounds = {
    left: 100,
    top: 50,
    width: 400,
    height: 200,
  };

  it('画面上の座標をCanvas内の相対座標へ変換する', () => {
    expect(normalizeCanvasPoint(300, 100, bounds)).toEqual({
      x: 0.5,
      y: 0.25,
    });
  });

  it('Canvas外の座標を0〜1の範囲に収める', () => {
    expect(normalizeCanvasPoint(50, 300, bounds)).toEqual({
      x: 0,
      y: 1,
    });
  });
});

describe('ストロークの線長計算', () => {
  it('相対座標の点列を表示上のピクセル長へ変換する', () => {
    const length = calculateStrokeLength([
      { x: 0, y: 0 },
      { x: 0.3, y: 0.4 },
      { x: 0.6, y: 0.8 },
    ], 10, 10);

    expect(length).toBe(10);
  });

  it('点が1つ以下なら長さを0とする', () => {
    expect(calculateStrokeLength([], 100, 100)).toBe(0);
    expect(calculateStrokeLength([{ x: 0.5, y: 0.5 }], 100, 100)).toBe(0);
  });
});
