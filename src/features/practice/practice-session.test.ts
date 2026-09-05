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
  it('出題数を安全な範囲へ正規化する', () => {
    const settings = freshDefaultSettings();
    settings.count = 99;

    const normalized = normalizeSessionSettings(settings);

    expect(normalized.count).toBe(20);
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

  it('同じシードと設定ならセッション全体を再現する', () => {
    const settings = freshDefaultSettings();
    settings.count = 3;

    const first = preparePracticeSession(settings, 24680);
    const second = preparePracticeSession(settings, 24680);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      schemaVersion: 1,
      seed: 24680,
      generatorVersion: 1,
      settings: { count: 3 },
    });
  });

  it('実際に使用したシードをセッションへ記録する', () => {
    const settings = freshDefaultSettings();

    const prepared = preparePracticeSession(settings, 13579);

    expect(prepared.seed).toBe(13579);
    expect(prepared.prompts.every((prompt) => prompt.generation?.seed === 13579)).toBe(true);
  });

  it('再挑戦では見本を保ったまま一意なIDだけを付け直す', () => {
    const prompt: ShapePrompt = preparePracticeSession(freshDefaultSettings(), 1).prompts[0];
    const retry = retryPrompt(prompt, 1234);

    expect(retry).toEqual({ ...prompt, id: `${prompt.id}-retry-1234` });
    expect(retry).not.toBe(prompt);
  });
});
