import { describe, expect, it } from 'vitest';
import { evaluateShadowMasks } from './shadow-evaluator';

const SIZE = 30;

function rectangleMask(minX: number, minY: number, maxX: number, maxY: number) {
  const mask = new Uint8Array(SIZE * SIZE);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) mask[y * SIZE + x] = 1;
  }
  return mask;
}

describe('evaluateShadowMasks', () => {
  it('見本と同じ影は100点になる', () => {
    const sample = rectangleMask(5, 18, 14, 23);

    expect(evaluateShadowMasks(sample, sample.slice(), SIZE, {
      alignmentX: 0,
      alignmentY: 0,
    })).toBe(100);
  });

  it('形状評価で求めた中心合わせを影にも適用する', () => {
    const sample = rectangleMask(5, 18, 14, 23);
    const shiftedWithShape = rectangleMask(9, 15, 18, 20);

    expect(evaluateShadowMasks(sample, shiftedWithShape, SIZE, {
      alignmentX: -4 / SIZE,
      alignmentY: 3 / SIZE,
    })).toBe(100);
  });

  it('立体に対する影の位置が異なる場合は減点する', () => {
    const sample = rectangleMask(2, 20, 10, 25);
    const wrongRelativePosition = rectangleMask(19, 3, 27, 8);

    expect(evaluateShadowMasks(sample, wrongRelativePosition, SIZE, {
      alignmentX: 0,
      alignmentY: 0,
    })).toBeLessThan(30);
  });

  it('影ペンの描画量が不足している場合は0点になる', () => {
    const sample = rectangleMask(5, 18, 14, 23);

    expect(evaluateShadowMasks(sample, new Uint8Array(SIZE * SIZE), SIZE, {
      alignmentX: 0,
      alignmentY: 0,
    })).toBe(0);
  });
});
