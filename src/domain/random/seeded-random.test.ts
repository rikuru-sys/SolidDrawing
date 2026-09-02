import { describe, expect, it } from 'vitest';
import { clampSeed, createSeededRandom, MAX_SEED, normalizeSeed } from './seeded-random';

describe('seeded random', () => {
  it('シード  値が同じ場合、同じ乱数のシーケンスを生成する', () => {
    const first = createSeededRandom(123456789);
    const second = createSeededRandom(123456789);

    expect(Array.from({ length: 20 }, first)).toEqual(Array.from({ length: 20 }, second));
  });

  it('シード値を32ビット符号なし整数の範囲内に制限する', () => {
    expect(clampSeed(-1)).toBe(0);
    expect(clampSeed(123.9)).toBe(123);
    expect(clampSeed(MAX_SEED + 1)).toBe(MAX_SEED);
    expect(clampSeed(Number.NaN)).toBe(0);
  });

  it('シード値を正規化する', () => {
    expect(normalizeSeed(MAX_SEED + 1)).toBe(0);
    expect(normalizeSeed(-1)).toBe(MAX_SEED);
  });
});
