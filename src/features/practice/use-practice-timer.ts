'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  countdownSnapshot,
  elapsedTimerSeconds,
  practiceDurationSeconds,
} from './practice-timer';

type UsePracticeTimerOptions = {
  active: boolean;
  timeLimit: number | null;
  onTimeout: () => void;
};

/** 練習1問分のカウントダウン、経過時間、一時停止を管理する。 */
export function usePracticeTimer({
  active,
  timeLimit,
  onTimeout,
}: UsePracticeTimerOptions) {
  const [remainingSeconds, setRemainingSeconds] = useState(timeLimit ?? 0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [timerCycle, setTimerCycle] = useState(0);
  const remainingRef = useRef(timeLimit ?? 0);
  const elapsedRef = useRef(0);
  const timeLimitRef = useRef(timeLimit);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    timeLimitRef.current = timeLimit;
  }, [timeLimit]);

  const reset = useCallback((nextTimeLimit: number | null) => {
    timeLimitRef.current = nextTimeLimit;
    remainingRef.current = nextTimeLimit ?? 0;
    elapsedRef.current = 0;
    setRemainingSeconds(remainingRef.current);
    setElapsedSeconds(0);
    setPaused(false);
    setTimerCycle((cycle) => cycle + 1);
  }, []);

  const togglePaused = useCallback(() => {
    setPaused((current) => !current);
  }, []);

  const resume = useCallback(() => {
    setPaused(false);
  }, []);

  const getDurationSeconds = useCallback((timedOut: boolean) => (
    practiceDurationSeconds({
      timeLimit: timeLimitRef.current,
      remainingSeconds: remainingRef.current,
      elapsedSeconds: elapsedRef.current,
      timedOut,
    })
  ), []);

  useEffect(() => {
    if (!active || paused) return;
    const startedAt = performance.now();
    let timer: number | undefined;
    let finished = false;

    if (timeLimit === null) {
      const startingElapsed = elapsedRef.current;
      function tick() {
        const nextElapsed = elapsedTimerSeconds(
          startingElapsed,
          startedAt,
          performance.now(),
        );
        if (nextElapsed !== elapsedRef.current) {
          elapsedRef.current = nextElapsed;
          setElapsedSeconds(nextElapsed);
        }
      }
      timer = window.setInterval(tick, 100);
    } else {
      const deadline = startedAt + Math.max(0, remainingRef.current) * 1000;
      function tick() {
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
      }
      tick();
      timer = window.setInterval(tick, 100);
    }

    return () => {
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [active, paused, timeLimit, timerCycle]);

  return {
    remainingSeconds,
    elapsedSeconds,
    paused,
    reset,
    resume,
    togglePaused,
    getDurationSeconds,
  };
}
