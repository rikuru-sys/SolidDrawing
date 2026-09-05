export type RandomSource = () => number;
const UINT32_RANGE = 0x1_0000_0000;
export const MAX_SEED = UINT32_RANGE - 1;
let fallbackSeedCounter = 0;

/**
 * 正の整数のシード値を正規化します。
 * @param seed シード値
 * @returns 正規化されたシード値
 * @throws {RangeError} シード値が有限の数値でない場合にスローされます。
 */
export function normalizeSeed(seed: number) {
  if (!Number.isFinite(seed)) {
    throw new RangeError('Seed must be a finite number.');
  }
  return Math.trunc(seed) >>> 0;
}

/**
 * シード値を32ビット符号なし整数の範囲内に制限します。
 * @param seed シード値
 * @returns 制限されたシード値
 * @throws {RangeError} シード値が有限の数値でない場合にスローされます。
 * @remarks
 * この関数は、シード値を0からMAX_SEED（2^32 - 1）までの範囲に制限します。
 * シード値が範囲外の場合、最も近い有効な値に丸められます。
 */
export function clampSeed(seed: number) {
  if (!Number.isFinite(seed)) return 0;
  return Math.max(0, Math.min(MAX_SEED, Math.trunc(seed)));
}

/**
 * シード値を元に、決定論的な乱数を生成する関数を作成します。
 * @param seed 乱数のシード値
 * @returns 乱数を生成する関数
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

/**
 * シード値を生成する関数
 * @returns 乱数のシード値
 */
export function createSessionSeed() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const value = new Uint32Array(1);
    cryptoApi.getRandomValues(value);
    return value[0];
  }

  // フォールバックとして、現在の時間とパフォーマンスの高精度タイマーを使用してシード値を生成
  fallbackSeedCounter = (fallbackSeedCounter + 1) >>> 0;
  const time = Date.now() >>> 0;
  const highResolutionTime = typeof performance === 'undefined'
    ? 0
    : Math.floor(performance.now() * 1000) >>> 0;
  return (time ^ highResolutionTime ^ Math.imul(fallbackSeedCounter, 0x9e3779b1)) >>> 0;
}
