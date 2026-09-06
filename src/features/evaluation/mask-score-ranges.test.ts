import { describe, expect, it } from 'vitest';
import { evaluateShapeMasks } from './mask-evaluator';
import { strictMetricScore } from './mask-geometry';
import { calculateMaskOverlapRatio } from './mask-metrics';
import { evaluateShadowMasks } from './shadow-evaluator';

const SIZE = 180;

function emptyMask() {
  return new Uint8Array(SIZE * SIZE);
}

function horizontalLine(startX: number, endX: number, y: number) {
  const mask = emptyMask();
  for (let x = startX; x <= endX; x += 1) mask[y * SIZE + x] = 1;
  return mask;
}

function rectangle(left: number, top: number, right: number, bottom: number) {
  const mask = emptyMask();
  for (let x = left; x <= right; x += 1) {
    mask[top * SIZE + x] = 1;
    mask[bottom * SIZE + x] = 1;
  }
  for (let y = top; y <= bottom; y += 1) {
    mask[y * SIZE + left] = 1;
    mask[y * SIZE + right] = 1;
  }
  return mask;
}

function mergeMasks(...masks: Uint8Array[]) {
  const merged = emptyMask();
  masks.forEach((mask) => mask.forEach((value, index) => {
    if (value) merged[index] = 1;
  }));
  return merged;
}

describe('評価点の判定範囲', () => {
  it.each([
    [1, 100],
    [0.9, 88],
    [0.8, 77],
    [0.7, 65],
    [0.5, 44],
    [0, 0],
  ])('一致率%sを%s点へ変換する', (ratio, expectedScore) => {
    expect(strictMetricScore(ratio)).toBe(expectedScore);
  });

  it('輪郭は5ピクセル以内のずれを許容する', () => {
    const sample = horizontalLine(40, 139, 80);
    const withinTolerance = horizontalLine(40, 139, 85);
    const outsideTolerance = horizontalLine(40, 139, 86);

    expect(calculateMaskOverlapRatio(sample, withinTolerance, SIZE, 5)).toBe(1);
    expect(calculateMaskOverlapRatio(sample, outsideTolerance, SIZE, 5)).toBe(0);
  });

  it('輪郭は同じ量の描き足しと描き漏らしを同程度に減点する', () => {
    const sample = horizontalLine(40, 139, 70);
    const extraLine = horizontalLine(40, 139, 100);
    const drawingWithExtra = mergeMasks(sample, extraLine);
    const halfDrawing = horizontalLine(40, 89, 70);

    const extraRatio = calculateMaskOverlapRatio(sample, drawingWithExtra, SIZE, 0);
    const missingRatio = calculateMaskOverlapRatio(sample, halfDrawing, SIZE, 0);
    expect(strictMetricScore(extraRatio)).toBe(61);
    expect(strictMetricScore(missingRatio)).toBe(61);
  });

  it('形状線は11ピクセル以下なら不足、12ピクセルなら評価可能とする', () => {
    const elevenPixels = horizontalLine(40, 50, 80);
    const twelvePixels = horizontalLine(40, 51, 80);

    expect(evaluateShapeMasks(elevenPixels, elevenPixels, SIZE).score).toBe(0);
    expect(evaluateShapeMasks(twelvePixels, twelvePixels, SIZE).score).toBe(100);
  });

  it('幅と高さがともに見本の90%なら大きさは88点になる', () => {
    const sample = rectangle(50, 50, 129, 129);
    const smaller = rectangle(54, 54, 125, 125);
    const evaluation = evaluateShapeMasks(sample, smaller, SIZE);

    expect(evaluation.size).toBe(88);
    expect(evaluation.proportion).toBe(100);
  });

  it('幅だけが見本の90%なら比率は88点になる', () => {
    const sample = rectangle(50, 50, 129, 129);
    const narrower = rectangle(54, 50, 125, 129);
    const evaluation = evaluateShapeMasks(sample, narrower, SIZE);

    expect(evaluation.size).toBe(94);
    expect(evaluation.proportion).toBe(88);
  });

  it('影は6ピクセル以内のずれを許容する', () => {
    const sample = horizontalLine(40, 139, 80);
    const withinTolerance = horizontalLine(40, 139, 86);
    const outsideTolerance = horizontalLine(40, 139, 87);
    const alignment = { alignmentX: 0, alignmentY: 0 };

    expect(evaluateShadowMasks(sample, withinTolerance, SIZE, alignment)).toBe(100);
    expect(evaluateShadowMasks(sample, outsideTolerance, SIZE, alignment)).toBe(0);
  });

  it('影は11ピクセル以下なら不足、12ピクセルなら評価可能とする', () => {
    const elevenPixels = horizontalLine(40, 50, 80);
    const twelvePixels = horizontalLine(40, 51, 80);
    const alignment = { alignmentX: 0, alignmentY: 0 };

    expect(evaluateShadowMasks(elevenPixels, elevenPixels, SIZE, alignment)).toBe(0);
    expect(evaluateShadowMasks(twelvePixels, twelvePixels, SIZE, alignment)).toBe(100);
  });
});
