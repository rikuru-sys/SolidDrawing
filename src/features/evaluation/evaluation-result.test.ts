import { describe, expect, it } from 'vitest';
import { addShadowEvaluation, createShapeEvaluation } from './evaluation-result';

const PERFECT_ALIGNMENT = {
  centeredMask: new Uint8Array(),
  alignmentX: 0,
  alignmentY: 0,
};

describe('evaluation result', () => {
  it('影を評価しない場合は従来の形状4項目だけで総合点を計算する', () => {
    const evaluation = createShapeEvaluation({
      outline: 80,
      angle: 70,
      size: 60,
      proportion: 50,
    }, PERFECT_ALIGNMENT);

    expect(evaluation.score).toBe(Math.round(80 * 0.45 + 70 * 0.25 + 60 * 0.2 + 50 * 0.1));
    expect(evaluation.shadow).toBeNull();
  });

  it('影を評価する場合は形状80%・影20%で総合点を計算する', () => {
    const shapeEvaluation = createShapeEvaluation({
      outline: 90,
      angle: 90,
      size: 90,
      proportion: 90,
    }, PERFECT_ALIGNMENT);
    const evaluation = addShadowEvaluation(shapeEvaluation, 40);

    expect(evaluation.score).toBe(Math.round(
      90 * 0.36 + 90 * 0.2 + 90 * 0.16 + 90 * 0.08 + 40 * 0.2,
    ));
    expect(evaluation.shadow).toBe(40);
    expect(evaluation.feedback).toContain('影が伸びる方向');
  });
});
