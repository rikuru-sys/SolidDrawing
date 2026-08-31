'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Favorite } from '../favorites/types';
import type { Attempt } from '../results/types';
import { DEFAULT_SETTINGS, type Settings } from '../settings/practice-settings';
import {
  countdownSnapshot,
  elapsedTimerSeconds,
  practiceDurationSeconds,
} from './practice-timer';
import {
  preparePracticeSession,
  retryPrompt,
  validatePracticeSettings,
} from './practice-session';

type UsePracticeSessionOptions = {
  active: boolean;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  onTimeout: () => void;
};

export function usePracticeSession({
  active,
  settings,
  onSettingsChange,
  onTimeout,
}: UsePracticeSessionOptions) {
  const [sessionSettings, setSessionSettings] = useState<Settings | null>(null);
  const [prompts, setPrompts] = useState<ReturnType<typeof preparePracticeSession>['prompts']>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_SETTINGS.time ?? 0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selectedResult, setSelectedResult] = useState(0);
  const [validation, setValidation] = useState('');
  const remainingRef = useRef(DEFAULT_SETTINGS.time ?? 0);
  const elapsedRef = useRef(0);
  const attemptsRef = useRef<Attempt[]>([]);
  const finishingRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);

  const practiceSettings = sessionSettings ?? settings;
  const currentPrompt = prompts[questionIndex];
  const currentResult = attempts[selectedResult];

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    attemptsRef.current = attempts;
  }, [attempts]);

  const resetTimer = useCallback((nextSettings: Settings) => {
    remainingRef.current = nextSettings.time ?? 0;
    elapsedRef.current = 0;
    setRemainingSeconds(remainingRef.current);
    setElapsedSeconds(0);
    setPaused(false);
  }, []);

  const replaceAttempts = useCallback((nextAttempts: Attempt[]) => {
    attemptsRef.current = nextAttempts;
    setAttempts(nextAttempts);
  }, []);

  const startPractice = useCallback((candidate: Settings = settings) => {
    const error = validatePracticeSettings(candidate);
    if (error) {
      setValidation(error);
      return false;
    }
    const prepared = preparePracticeSession(candidate);
    onSettingsChange(prepared.settings);
    setSessionSettings(prepared.settings);
    setPrompts(prepared.prompts);
    setQuestionIndex(0);
    resetTimer(prepared.settings);
    replaceAttempts([]);
    setSelectedResult(0);
    setValidation('');
    finishingRef.current = false;
    return true;
  }, [onSettingsChange, replaceAttempts, resetTimer, settings]);

  const retryCurrentPrompt = useCallback((attempt: Attempt, now = Date.now()) => {
    const retrySettings = sessionSettings ?? settings;
    setSessionSettings(retrySettings);
    setPrompts([retryPrompt(attempt.prompt, now)]);
    setQuestionIndex(0);
    resetTimer(retrySettings);
    finishingRef.current = false;
  }, [resetTimer, sessionSettings, settings]);

  const startFavoritePractice = useCallback((favorite: Favorite) => {
    const favoriteSettings = { ...favorite.settings, count: 1 };
    setSessionSettings(favoriteSettings);
    setPrompts([{ ...favorite.prompt }]);
    setQuestionIndex(0);
    resetTimer(favoriteSettings);
    replaceAttempts([]);
    setSelectedResult(0);
    finishingRef.current = false;
  }, [replaceAttempts, resetTimer]);

  const tryStartFinishing = useCallback(() => {
    if (finishingRef.current) return false;
    finishingRef.current = true;
    return true;
  }, []);

  const finishAttempt = useCallback((attempt: Attempt, endSession = false) => {
    const nextAttempts = [...attemptsRef.current, attempt];
    replaceAttempts(nextAttempts);
    const complete = questionIndex >= prompts.length - 1 || endSession;
    if (complete) {
      setSelectedResult(Math.max(0, nextAttempts.length - 1));
      setPaused(false);
    } else {
      setQuestionIndex((index) => index + 1);
      resetTimer(practiceSettings);
    }
    window.setTimeout(() => {
      finishingRef.current = false;
    }, 0);
    return complete;
  }, [practiceSettings, prompts.length, questionIndex, replaceAttempts, resetTimer]);

  const getDurationSeconds = useCallback((timedOut: boolean) => (
    practiceDurationSeconds({
      timeLimit: practiceSettings.time,
      remainingSeconds: remainingRef.current,
      elapsedSeconds: elapsedRef.current,
      timedOut,
    })
  ), [practiceSettings.time]);

  const clearValidation = useCallback(() => {
    setValidation('');
  }, []);

  useEffect(() => {
    if (!active || paused) return;
    const startedAt = performance.now();
    let timer: number | undefined;
    let finished = false;

    if (practiceSettings.time === null) {
      const startingElapsed = elapsedRef.current;
      const tick = () => {
        const nextElapsed = elapsedTimerSeconds(startingElapsed, startedAt, performance.now());
        if (nextElapsed !== elapsedRef.current) {
          elapsedRef.current = nextElapsed;
          setElapsedSeconds(nextElapsed);
        }
      };
      timer = window.setInterval(tick, 100);
    } else {
      const deadline = startedAt + Math.max(0, remainingRef.current) * 1000;
      const tick = () => {
        const snapshot = countdownSnapshot(deadline, performance.now());
        if (snapshot.complete) {
          if (finished) return;
          finished = true;
          remainingRef.current = 0;
          setRemainingSeconds(0);
          if (timer !== undefined) window.clearInterval(timer);
          window.setTimeout(() => onTimeoutRef.current(), 0);
          return;
        }
        if (snapshot.remainingSeconds !== remainingRef.current) {
          remainingRef.current = snapshot.remainingSeconds;
          setRemainingSeconds(snapshot.remainingSeconds);
        }
      };
      tick();
      timer = window.setInterval(tick, 100);
    }

    return () => {
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [active, paused, practiceSettings.time, questionIndex]);

  return {
    sessionSettings,
    setSessionSettings,
    practiceSettings,
    prompts,
    currentPrompt,
    questionIndex,
    remainingSeconds,
    elapsedSeconds,
    paused,
    setPaused,
    attempts,
    currentResult,
    selectedResult,
    setSelectedResult,
    validation,
    clearValidation,
    startPractice,
    retryCurrentPrompt,
    startFavoritePractice,
    tryStartFinishing,
    finishAttempt,
    getDurationSeconds,
  };
}
