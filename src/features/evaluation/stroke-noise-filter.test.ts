import { describe, expect, it } from 'vitest';
import type { DrawingToolId, Stroke } from '../drawing/types';
import { excludeDrawingNoise } from './stroke-noise-filter';

function stroke(tool: DrawingToolId, points: Stroke['points']): Stroke {
  return { tool, points, width: 3, color: '#30322c', opacity: 1, stabilization: 'off' };
}

describe('excludeDrawingNoise', () => {
  it('主要線を残し、孤立した点と極端に短い線を除外する', () => {
    const mainLine = stroke('pen', [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.8 }]);
    const point = stroke('pen', [{ x: 0.95, y: 0.05 }]);
    const shortLine = stroke('pen', [{ x: 0.9, y: 0.1 }, { x: 0.905, y: 0.105 }]);

    expect(excludeDrawingNoise([mainLine, point, shortLine])).toEqual([mainLine]);
  });

  it('離れている線でも十分な長さがあれば残す', () => {
    const leftEdge = stroke('pen', [{ x: 0.2, y: 0.2 }, { x: 0.3, y: 0.7 }]);
    const rightEdge = stroke('pen', [{ x: 0.8, y: 0.2 }, { x: 0.7, y: 0.7 }]);

    expect(excludeDrawingNoise([leftEdge, rightEdge])).toEqual([leftEdge, rightEdge]);
  });

  it('形状線と影線を別々の基準で判定し、消しゴムは残す', () => {
    const shapeLine = stroke('pen', [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }]);
    const shadowLine = stroke('shadow', [{ x: 0.3, y: 0.7 }, { x: 0.4, y: 0.72 }]);
    const eraser = stroke('eraser', [{ x: 0.4, y: 0.4 }]);

    expect(excludeDrawingNoise([shapeLine, shadowLine, eraser]))
      .toEqual([shapeLine, shadowLine, eraser]);
  });
});
