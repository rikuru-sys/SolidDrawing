import { createSeededRandom, normalizeSeed, type RandomSource } from '../random/seeded-random';
import type { Difficulty, LightDirection, ShapeName, ShapePrompt } from './types';

/**
 * プロンプト生成器のバージョン番号
 * これを変更すると、以前のバージョンで生成されたプロンプトと互換性がなくなります。
 */
export const PROMPT_GENERATOR_VERSION = 1 as const;

/**
 * プロンプト生成のオプション
 * @property shapes 生成する形状の種類
 * @property count 生成するプロンプトの数
 * @property lightDirections 光源の方向の配列
 * @property difficulty 難易度
 * @property seed 乱数のシード値
 */
export type CreatePromptsOptions = {
  shapes: readonly ShapeName[];
  count: number;
  lightDirections: readonly LightDirection[];
  difficulty: Difficulty;
  seed: number;
};

/**
 * 乱数を生成する関数
 * @param random 乱数生成関数
 * @param min 最小値
 * @param max 最大値
 * @returns min以上max未満の乱数
 */
function randomBetween(random: RandomSource, min: number, max: number) {
  return min + random() * (max - min);
}

/**
 * 乱数を生成する関数
 * @param random 乱数生成関数
 * @param values 配列
 * @returns 配列からランダムに選ばれた要素
 */
function randomItem<T>(random: RandomSource, values: readonly T[]) {
  return values[Math.floor(random() * values.length)];
}

/**
 * 指定された条件に基づいて、形状のプロンプトを生成します。
 * @param shapes 生成する形状の種類
 * @param count 生成するプロンプトの数
 * @param lightDirections 光源の方向の配列
 * @param difficulty 難易度
 * @param seed 乱数のシード値
 * @returns 生成された形状のプロンプトの配列
 */
export function createPrompts({
  shapes,
  count,
  lightDirections,
  difficulty,
  seed,
}: CreatePromptsOptions): ShapePrompt[] {

  if (!shapes.length) throw new RangeError('シェイプが指定されていません。');
  if (!lightDirections.length) throw new RangeError('少なくとも1つの光源の方向が必要です。');

  // シード値を正規化し、乱数生成器を作成
  const normalizedSeed = normalizeSeed(seed);
  const random = createSeededRandom(normalizedSeed);
  const promptCount = Math.max(0, Math.floor(count));

  // 以前の形状を保持して、同じ形状が連続しないようにする
  let previous: ShapeName | undefined;

  // 生成されたプロンプトの配列を作成
  return Array.from({ length: promptCount }, (_, index) => {
    const available = shapes.length > 1 ? shapes.filter((shape) => shape !== previous) : shapes;
    const shape = randomItem(random, available);
    const hardTilt = randomBetween(random, 0.38, 1.02) * (random() > 0.5 ? 1 : -1);
    previous = shape;

    return {
      id: `v${PROMPT_GENERATOR_VERSION}-${normalizedSeed.toString(16).padStart(8, '0')}-${index + 1}`,
      shape,
      widthScale: randomBetween(random, 0.82, 1.14),
      heightScale: randomBetween(random, 0.84, 1.15),
      depthScale: randomBetween(random, 0.78, 1.12),
      cameraAzimuth: randomBetween(random, -Math.PI, Math.PI),
      cameraElevation: randomBetween(random, 0.24, 0.82),
      objectRotationX: difficulty === 'hard' ? hardTilt : 0,
      objectRotationY: difficulty === 'hard' ? randomBetween(random, -Math.PI, Math.PI) : 0,
      objectRotationZ: difficulty === 'hard' ? randomBetween(random, -0.55, 0.55) : 0,
      lightDirection: randomItem(random, lightDirections),
      generation: {
        seed: normalizedSeed,
        version: PROMPT_GENERATOR_VERSION,
        index,
      },
    };
  });
}
