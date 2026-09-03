import { describe, expect, it, vi } from 'vitest';
import { applyEvaluationStrokeStyle } from './stroke-rendering';
import { createDrawingStroke } from './tools/tool-registry';
import type { DrawingToolId } from './types';

const STROKE_OPTIONS = {
  point: { x: 0.25, y: 0.75 },
  width: 3,
  color: '#30322c',
  opacity: 1,
  stabilization: 'low' as const,
};

function context() {
  return {
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    setLineDash: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function apply(tool: DrawingToolId, target: 'shape' | 'shadow') {
  const targetContext = context();
  const applied = applyEvaluationStrokeStyle(
    targetContext,
    createDrawingStroke(tool, STROKE_OPTIONS),
    target,
  );
  return { applied, targetContext };
}

describe('applyEvaluationStrokeStyle', () => {
  it('形状評価には通常ペンと点線だけを含める', () => {
    expect(apply('pen', 'shape').applied).toBe(true);
    expect(apply('dashed', 'shape').applied).toBe(true);
    expect(apply('shadow', 'shape').applied).toBe(false);
    expect(apply('guide', 'shape').applied).toBe(false);
  });

  it('影評価には影ペンだけを含める', () => {
    const shadow = apply('shadow', 'shadow');

    expect(shadow.applied).toBe(true);
    expect(shadow.targetContext.lineWidth).toBe(9);
    expect(apply('pen', 'shadow').applied).toBe(false);
    expect(apply('dashed', 'shadow').applied).toBe(false);
    expect(apply('guide', 'shadow').applied).toBe(false);
  });

  it.each(['shape', 'shadow'] as const)('%s評価では消しゴムを反映する', (target) => {
    const eraser = apply('eraser', target);

    expect(eraser.applied).toBe(true);
    expect(eraser.targetContext.globalCompositeOperation).toBe('destination-out');
  });
});
