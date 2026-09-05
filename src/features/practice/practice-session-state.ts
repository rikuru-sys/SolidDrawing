import type { ShapePrompt } from '../../domain/prompt/types';
import type { Attempt } from '../results/types';
import type { Settings } from '../settings/practice-settings';
import type { PracticeSessionSnapshot } from './practice-session';

export type PracticeSessionState = {
  sessionSettings: Settings | null;
  sessionSnapshot: PracticeSessionSnapshot | null;
  prompts: ShapePrompt[];
  questionIndex: number;
  attempts: Attempt[];
  validation: string;
};

export type PracticeSessionAction =
  | { type: 'validation-failed'; message: string }
  | { type: 'started'; snapshot: PracticeSessionSnapshot }
  | { type: 'retried'; settings: Settings; prompt: ShapePrompt }
  | { type: 'favorite-started'; settings: Settings; prompt: ShapePrompt }
  | { type: 'attempt-finished'; attempt: Attempt; complete: boolean }
  | { type: 'settings-updated'; settings: Settings }
  | { type: 'validation-cleared' };

export function createInitialPracticeSessionState(): PracticeSessionState {
  return {
    sessionSettings: null,
    sessionSnapshot: null,
    prompts: [],
    questionIndex: 0,
    attempts: [],
    validation: '',
  };
}

/** 練習の開始、再挑戦、回答完了による状態遷移を一か所で管理する。 */
export function practiceSessionReducer(
  state: PracticeSessionState,
  action: PracticeSessionAction,
): PracticeSessionState {
  switch (action.type) {
    case 'validation-failed':
      return { ...state, validation: action.message };
    case 'started':
      return {
        sessionSettings: action.snapshot.settings,
        sessionSnapshot: action.snapshot,
        prompts: action.snapshot.prompts,
        questionIndex: 0,
        attempts: [],
        validation: '',
      };
    case 'retried':
      return {
        ...state,
        sessionSettings: action.settings,
        sessionSnapshot: null,
        prompts: [action.prompt],
        questionIndex: 0,
      };
    case 'favorite-started':
      return {
        sessionSettings: action.settings,
        sessionSnapshot: null,
        prompts: [action.prompt],
        questionIndex: 0,
        attempts: [],
        validation: '',
      };
    case 'attempt-finished':
      return {
        ...state,
        attempts: [...state.attempts, action.attempt],
        questionIndex: action.complete
          ? state.questionIndex
          : state.questionIndex + 1,
      };
    case 'settings-updated':
      return { ...state, sessionSettings: action.settings };
    case 'validation-cleared':
      return { ...state, validation: '' };
  }
}
