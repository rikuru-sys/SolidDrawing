export type RandomSource = () => number;
export type SeedMode = 'random' | 'fixed';

const UINT32_RANGE = 0x1_0000_0000;
export const MAX_SEED = UINT32_RANGE - 1;
let fallbackSeedCounter = 0;

export function normalizeSeed(seed: number) {
  if (!Number.isFinite(seed)) {
    throw new RangeError('Seed must be a finite number.');
  }
  return Math.trunc(seed) >>> 0;
}

export function clampSeed(seed: number) {
  if (!Number.isFinite(seed)) return 0;
  return Math.max(0, Math.min(MAX_SEED, Math.trunc(seed)));
}

/**
 * Creates a deterministic 32-bit pseudo-random source.
 * The algorithm is intentionally kept local so prompt generation does not
 * depend on Math.random() or browser-specific random implementations.
 */
export function createSeededRandom(seed: number): RandomSource {
  let state = normalizeSeed(seed);

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

/** Creates a new seed for normal practice sessions. */
export function createSessionSeed() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const value = new Uint32Array(1);
    cryptoApi.getRandomValues(value);
    return value[0];
  }

  // This fallback is only for environments without Web Crypto. Prompt
  // generation itself remains deterministic after the seed is created.
  fallbackSeedCounter = (fallbackSeedCounter + 1) >>> 0;
  const time = Date.now() >>> 0;
  const highResolutionTime = typeof performance === 'undefined'
    ? 0
    : Math.floor(performance.now() * 1000) >>> 0;
  return (time ^ highResolutionTime ^ Math.imul(fallbackSeedCounter, 0x9e3779b1)) >>> 0;
}
