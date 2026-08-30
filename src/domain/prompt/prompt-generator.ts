import { createSeededRandom, normalizeSeed, type RandomSource } from '../random/seeded-random';
import type { Difficulty, LightDirection, ShapeName, ShapePrompt } from './types';

export const PROMPT_GENERATOR_VERSION = 1 as const;

export type CreatePromptsOptions = {
  shapes: readonly ShapeName[];
  count: number;
  lightDirections: readonly LightDirection[];
  difficulty: Difficulty;
  seed: number;
};

function randomBetween(random: RandomSource, min: number, max: number) {
  return min + random() * (max - min);
}

function randomItem<T>(random: RandomSource, values: readonly T[]) {
  return values[Math.floor(random() * values.length)];
}

export function createPrompts({
  shapes,
  count,
  lightDirections,
  difficulty,
  seed,
}: CreatePromptsOptions): ShapePrompt[] {
  if (!shapes.length) throw new RangeError('At least one shape is required.');
  if (!lightDirections.length) throw new RangeError('At least one light direction is required.');

  const normalizedSeed = normalizeSeed(seed);
  const random = createSeededRandom(normalizedSeed);
  const promptCount = Math.max(0, Math.floor(count));
  let previous: ShapeName | undefined;

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
