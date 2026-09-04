import { describe, expect, it } from 'vitest';
import type { ShapePrompt } from '../../domain/prompt/types';
import { unevaluatedShape } from '../evaluation/shape-evaluator';
import type { Attempt } from '../results/types';
import { freshDefaultSettings } from '../settings/practice-settings';
import {
  createInitialPracticeSessionState,
  practiceSessionReducer,
} from './practice-session-state';

function prompt(id: string): ShapePrompt {
  return {
    id,
    shape: '立方体',
    widthScale: 1,
    heightScale: 1,
    depthScale: 1,
    cameraAzimuth: 0,
    cameraElevation: 0,
    objectRotationX: 0,
    objectRotationY: 0,
    objectRotationZ: 0,
    lightDirection: 'top-left',
  };
}

function attempt(id: string): Attempt {
  return {
    prompt: prompt(id),
    sampleImage: '',
    drawingImage: '',
    alignedDrawingImage: '',
    drawingSvg: '',
    alignedDrawingSvg: '',
    seconds: 30,
    evaluation: unevaluatedShape(),
    practiceMode: 'canvas',
  };
}

describe('practice session state', () => {
  it('開始時に出題と設定を保存して以前の結果を消去する', () => {
    const settings = freshDefaultSettings();
    const state = practiceSessionReducer(createInitialPracticeSessionState(), {
      type: 'started',
      settings,
      prompts: [prompt('one'), prompt('two')],
    });

    expect(state.sessionSettings).toBe(settings);
    expect(state.prompts).toHaveLength(2);
    expect(state.questionIndex).toBe(0);
    expect(state.attempts).toEqual([]);
  });

  it('回答完了時に結果を追加して次の問題へ進む', () => {
    const started = practiceSessionReducer(createInitialPracticeSessionState(), {
      type: 'started',
      settings: freshDefaultSettings(),
      prompts: [prompt('one'), prompt('two')],
    });
    const next = practiceSessionReducer(started, {
      type: 'attempt-finished',
      attempt: attempt('one'),
      complete: false,
    });

    expect(next.attempts).toHaveLength(1);
    expect(next.questionIndex).toBe(1);
  });

  it('最終問題では結果を追加して問題番号を保持する', () => {
    const started = practiceSessionReducer(createInitialPracticeSessionState(), {
      type: 'started',
      settings: freshDefaultSettings(),
      prompts: [prompt('one')],
    });
    const complete = practiceSessionReducer(started, {
      type: 'attempt-finished',
      attempt: attempt('one'),
      complete: true,
    });

    expect(complete.attempts).toHaveLength(1);
    expect(complete.questionIndex).toBe(0);
  });
});
