'use client';

import {
  useCallback,
  useReducer,
  useRef,
} from 'react';
import type { Favorite } from '../favorites/types';
import type { Attempt } from '../results/types';
import type { Settings } from '../settings/practice-settings';
import {
  preparePracticeSession,
  retryPrompt,
  validatePracticeSettings,
} from './practice-session';
import {
  createInitialPracticeSessionState,
  practiceSessionReducer,
} from './practice-session-state';
import type { PracticePenStylePatch } from './practice-screen.types';
import { usePracticeTimer } from './use-practice-timer';

type UsePracticeSessionOptions = {
  active: boolean;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  onTimeout: () => void;
};

/** 出題、試行結果、設定とタイマーを接続し、練習セッションの操作を提供する。 */
export function usePracticeSession({
  active,
  settings,
  onSettingsChange,
  onTimeout,
}: UsePracticeSessionOptions) {
  const [state, dispatch] = useReducer(
    practiceSessionReducer,
    undefined,
    createInitialPracticeSessionState,
  );
  const finishingRef = useRef(false);
  const practiceSettings = state.sessionSettings ?? settings;
  const currentPrompt = state.prompts[state.questionIndex];
  const {
    remainingSeconds,
    elapsedSeconds,
    paused,
    reset: resetTimer,
    resume: resumeTimer,
    togglePaused,
    getDurationSeconds,
  } = usePracticeTimer({
    active,
    timeLimit: practiceSettings.time,
    onTimeout,
  });

  const startPractice = useCallback((candidate: Settings = settings) => {
    const error = validatePracticeSettings(candidate);
    if (error) {
      dispatch({ type: 'validation-failed', message: error });
      return false;
    }

    const prepared = preparePracticeSession(candidate);
    onSettingsChange(prepared.settings);
    dispatch({
      type: 'started',
      settings: prepared.settings,
      prompts: prepared.prompts,
    });
    resetTimer(prepared.settings.time);
    finishingRef.current = false;
    return true;
  }, [onSettingsChange, resetTimer, settings]);

  const retryCurrentPrompt = useCallback((attempt: Attempt, now = Date.now()) => {
    const retrySettings = state.sessionSettings ?? settings;
    dispatch({
      type: 'retried',
      settings: retrySettings,
      prompt: retryPrompt(attempt.prompt, now),
    });
    resetTimer(retrySettings.time);
    finishingRef.current = false;
  }, [resetTimer, settings, state.sessionSettings]);

  const startFavoritePractice = useCallback((favorite: Favorite) => {
    const favoriteSettings = { ...favorite.settings, count: 1 };
    dispatch({
      type: 'favorite-started',
      settings: favoriteSettings,
      prompt: { ...favorite.prompt },
    });
    resetTimer(favoriteSettings.time);
    finishingRef.current = false;
  }, [resetTimer]);

  const tryStartFinishing = useCallback(() => {
    if (finishingRef.current) return false;
    finishingRef.current = true;
    return true;
  }, []);

  const finishAttempt = useCallback((attempt: Attempt, endSession = false) => {
    const complete = state.questionIndex >= state.prompts.length - 1 || endSession;
    dispatch({ type: 'attempt-finished', attempt, complete });

    if (complete) {
      resumeTimer();
    } else {
      resetTimer(practiceSettings.time);
    }

    window.setTimeout(() => {
      finishingRef.current = false;
    }, 0);
    return complete;
  }, [
    practiceSettings.time,
    resetTimer,
    resumeTimer,
    state.prompts.length,
    state.questionIndex,
  ]);

  const clearValidation = useCallback(() => {
    dispatch({ type: 'validation-cleared' });
  }, []);

  const updatePracticeSettings = useCallback((patch: PracticePenStylePatch) => {
    const nextSettings = { ...practiceSettings, ...patch };
    dispatch({ type: 'settings-updated', settings: nextSettings });
    onSettingsChange(nextSettings);
  }, [onSettingsChange, practiceSettings]);

  return {
    current: {
      settings: practiceSettings,
      prompt: currentPrompt,
      questionIndex: state.questionIndex,
      questionCount: state.prompts.length,
    },
    timer: {
      remainingSeconds,
      elapsedSeconds,
      paused,
    },
    results: {
      attempts: state.attempts,
    },
    validation: {
      message: state.validation,
      clear: clearValidation,
    },
    actions: {
      start: startPractice,
      retry: retryCurrentPrompt,
      startFavorite: startFavoritePractice,
      beginFinishing: tryStartFinishing,
      finish: finishAttempt,
      getDurationSeconds,
      togglePaused,
      updateSettings: updatePracticeSettings,
    },
  };
}
