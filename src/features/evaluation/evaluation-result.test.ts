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

  it.each([
    ['輪郭', { outline: 44, angle: 100, size: 100, proportion: 100 }, '輪郭線'],
    ['傾き', { outline: 100, angle: 59, size: 100, proportion: 100 }, '傾き'],
    ['大きさ', { outline: 100, angle: 100, size: 69, proportion: 100 }, '大きさ'],
    ['比率', { outline: 100, angle: 100, size: 100, proportion: 69 }, '縦横比'],
  ] as const)('%sが改善基準を1点下回ると対応する助言を表示する', (
    _label,
    scores,
    expectedFeedback,
  ) => {
    expect(createShapeEvaluation(scores, PERFECT_ALIGNMENT).feedback)
      .toContain(expectedFeedback);
  });

  it.each([
    { outline: 45, angle: 100, size: 100, proportion: 100 },
    { outline: 100, angle: 60, size: 100, proportion: 100 },
    { outline: 100, angle: 100, size: 70, proportion: 100 },
    { outline: 100, angle: 100, size: 100, proportion: 70 },
  ])('改善基準以上なら該当項目の助言を表示しない', (scores) => {
    const evaluation = createShapeEvaluation(scores, PERFECT_ALIGNMENT);
    if (scores.outline === 45) expect(evaluation.feedback).not.toContain('輪郭線');
    if (scores.angle === 60) expect(evaluation.feedback).not.toContain('水平線・垂直線');
    if (scores.size === 70) expect(evaluation.feedback).not.toContain('拡大・縮小');
    if (scores.proportion === 70) expect(evaluation.feedback).not.toContain('全体の縦横比');
  });

  it('影59点では影の助言、60点では良好な助言を表示する', () => {
    const shape = createShapeEvaluation({
      outline: 100,
      angle: 100,
      size: 100,
      proportion: 100,
    }, PERFECT_ALIGNMENT);

    expect(addShadowEvaluation(shape, 59).feedback).toContain('影が伸びる方向');
    expect(addShadowEvaluation(shape, 60).feedback).not.toContain('影が伸びる方向');
  });
});
