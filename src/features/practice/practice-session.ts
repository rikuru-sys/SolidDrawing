import { createPrompts } from '../../domain/prompt/prompt-generator';
import type { ShapePrompt } from '../../domain/prompt/types';
import {
  clampSeed,
  createSessionSeed,
} from '../../domain/random/seeded-random';
import {
  ALL_LIGHT_DIRECTIONS,
  type Settings,
} from '../settings/practice-settings';

export type PreparedPracticeSession = {
  settings: Settings;
  prompts: ShapePrompt[];
};

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
    fixedSeed: clampSeed(settings.fixedSeed),
  };
}

export function preparePracticeSession(
  settings: Settings,
  randomSeed = createSessionSeed(),
): PreparedPracticeSession {
  const normalized = normalizeSessionSettings(settings);
  return {
    settings: normalized,
    prompts: createPrompts({
      shapes: normalized.shapes,
      count: normalized.count,
      lightDirections: normalized.lightDirections.length
        ? normalized.lightDirections
        : ALL_LIGHT_DIRECTIONS,
      difficulty: normalized.difficulty,
      seed: normalized.seedMode === 'fixed'
        ? normalized.fixedSeed
        : randomSeed,
    }),
  };
}

export function retryPrompt(prompt: ShapePrompt, now = Date.now()): ShapePrompt {
  return {
    ...prompt,
    id: `${prompt.id}-retry-${now}`,
  };
}
