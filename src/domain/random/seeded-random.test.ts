import { describe, expect, it } from 'vitest';
import { clampSeed, createSeededRandom, MAX_SEED, normalizeSeed } from './seeded-random';

describe('seeded random', () => {
  it('creates the same sequence from the same seed', () => {
    const first = createSeededRandom(123456789);
    const second = createSeededRandom(123456789);

    expect(Array.from({ length: 20 }, first)).toEqual(Array.from({ length: 20 }, second));
  });

  it('keeps fixed seed input inside the unsigned 32-bit range', () => {
    expect(clampSeed(-1)).toBe(0);
    expect(clampSeed(123.9)).toBe(123);
    expect(clampSeed(MAX_SEED + 1)).toBe(MAX_SEED);
    expect(clampSeed(Number.NaN)).toBe(0);
  });

  it('normalizes equivalent 32-bit seeds consistently', () => {
    expect(normalizeSeed(MAX_SEED + 1)).toBe(0);
    expect(normalizeSeed(-1)).toBe(MAX_SEED);
  });
});
