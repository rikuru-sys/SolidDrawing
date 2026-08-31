import { describe, expect, it } from 'vitest';
import type { ShapePrompt } from '../../domain/prompt/types';
import { freshDefaultSettings } from '../settings/practice-settings';
import {
  normalizeSessionSettings,
  preparePracticeSession,
  retryPrompt,
  validatePracticeSettings,
} from './practice-session';

describe('practice session', () => {
  it('出題数と固定シードを安全な範囲へ正規化する', () => {
    const settings = freshDefaultSettings();
    settings.count = 99;
    settings.fixedSeed = -12;

    const normalized = normalizeSessionSettings(settings);

    expect(normalized.count).toBe(20);
    expect(normalized.fixedSeed).toBeGreaterThanOrEqual(0);
    expect(settings.count).toBe(99);
  });

  it('出題できない設定に日本語の検証メッセージを返す', () => {
    const noShapes = freshDefaultSettings();
    noShapes.shapes = [];
    expect(validatePracticeSettings(noShapes)).toContain('立体');

    const noLight = freshDefaultSettings();
    noLight.sampleStyle = 'shadow';
    noLight.lightDirections = [];
    expect(validatePracticeSettings(noLight)).toContain('光源');
    expect(validatePracticeSettings(freshDefaultSettings())).toBe('');
  });

  it('固定シードなら常に同じ出題列を作る', () => {
    const settings = freshDefaultSettings();
    settings.seedMode = 'fixed';
    settings.fixedSeed = 24680;
    settings.count = 3;

    expect(preparePracticeSession(settings, 1).prompts)
      .toEqual(preparePracticeSession(settings, 999).prompts);
  });

  it('再挑戦では見本を保ったまま一意なIDだけを付け直す', () => {
    const prompt: ShapePrompt = preparePracticeSession(freshDefaultSettings(), 1).prompts[0];
    const retry = retryPrompt(prompt, 1234);

    expect(retry).toEqual({ ...prompt, id: `${prompt.id}-retry-1234` });
    expect(retry).not.toBe(prompt);
  });
});
