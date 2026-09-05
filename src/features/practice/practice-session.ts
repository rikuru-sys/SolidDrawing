import {
  createPrompts,
  PROMPT_GENERATOR_VERSION,
} from '../../domain/prompt/prompt-generator';
import type {
  PromptGeneratorVersion,
  ShapePrompt,
} from '../../domain/prompt/types';
import {
  createSessionSeed,
  normalizeSeed,
} from '../../domain/random/seeded-random';
import {
  ALL_LIGHT_DIRECTIONS,
  type Settings,
} from '../settings/practice-settings';

export const PRACTICE_SESSION_SCHEMA_VERSION = 1 as const;

export type PracticeSessionSnapshot = {
  schemaVersion: typeof PRACTICE_SESSION_SCHEMA_VERSION;
  seed: number;
  generatorVersion: PromptGeneratorVersion;
  settings: Settings;
  prompts: ShapePrompt[];
};

export type PreparedPracticeSession = PracticeSessionSnapshot;

export function validatePracticeSettings(settings: Settings) {
  if (!settings.shapes.length) return '少なくとも1つの立体を選んでください。';
  if (settings.sampleStyle === 'shadow' && !settings.lightDirections.length) {
    return '光源の方向を少なくとも1つ選んでください。';
  }
  return '';
}

export function normalizeSessionSettings(settings: Settings): Settings {
  return {
    ...settings,
    count: Math.max(1, Math.min(20, Number(settings.count) || 1)),
  };
}

export function preparePracticeSession(
  settings: Settings,
  randomSeed = createSessionSeed(),
): PreparedPracticeSession {
  const normalized = normalizeSessionSettings(settings);
  const seed = normalizeSeed(randomSeed);
  return {
    schemaVersion: PRACTICE_SESSION_SCHEMA_VERSION,
    seed,
    generatorVersion: PROMPT_GENERATOR_VERSION,
    settings: normalized,
    prompts: createPrompts({
      shapes: normalized.shapes,
      count: normalized.count,
      lightDirections: normalized.lightDirections.length
        ? normalized.lightDirections
        : ALL_LIGHT_DIRECTIONS,
      difficulty: normalized.difficulty,
      seed,
    }),
  };
}

export function retryPrompt(prompt: ShapePrompt, now = Date.now()): ShapePrompt {
  return {
    ...prompt,
    id: `${prompt.id}-retry-${now}`,
  };
}
