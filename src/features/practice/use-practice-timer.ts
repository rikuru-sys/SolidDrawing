'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  countdownSnapshot,
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
  const accumulatedMillisecondsRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const cycleRef = useRef(0);
  const timeLimitRef = useRef(timeLimit);
  const onTimeoutRef = useRef(onTimeout);

  const getElapsedMilliseconds = useCallback(() => (
    accumulatedMillisecondsRef.current + (startedAtRef.current === null
      ? 0
      : Math.max(0, performance.now() - startedAtRef.current))
  ), []);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    timeLimitRef.current = timeLimit;
  }, [timeLimit]);

  const reset = useCallback((nextTimeLimit: number | null) => {
    timeLimitRef.current = nextTimeLimit;
    cycleRef.current += 1;
    accumulatedMillisecondsRef.current = 0;
    startedAtRef.current = null;
    setRemainingSeconds(nextTimeLimit ?? 0);
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

  const getDurationSeconds = useCallback((timedOut: boolean) => {
    const elapsed = getElapsedMilliseconds() / 1000;
    return practiceDurationSeconds({
      timeLimit: timeLimitRef.current,
      remainingSeconds: Math.ceil(Math.max(0, (timeLimitRef.current ?? 0) - elapsed)),
      elapsedSeconds: Math.floor(elapsed),
      timedOut,
    });
  }, [getElapsedMilliseconds]);

  useEffect(() => {
    if (!active || paused) return;
    const cycle = cycleRef.current;
    startedAtRef.current = performance.now();
    let timeout: number | undefined;
    let finished = false;
    function tick() {
      const elapsedMilliseconds = getElapsedMilliseconds();
      if (timeLimit === null) {
        setElapsedSeconds(Math.floor(elapsedMilliseconds / 1000));
        return;
      }

      const snapshot = countdownSnapshot(timeLimit * 1000, elapsedMilliseconds);
      setRemainingSeconds(snapshot.remainingSeconds);
      if (snapshot.complete && !finished) {
        finished = true;
        window.clearInterval(timer);
        timeout = window.setTimeout(() => onTimeoutRef.current(), 0);
      }
    }
    const timer = window.setInterval(tick, 100);
    tick();

    return () => {
      window.clearInterval(timer);
      if (timeout !== undefined) window.clearTimeout(timeout);
      // 次問へのリセット後は、前問の終了処理で時間を戻さない。
      if (cycleRef.current === cycle) {
        accumulatedMillisecondsRef.current = getElapsedMilliseconds();
        startedAtRef.current = null;
      }
    };
  }, [active, paused, timeLimit, timerCycle, getElapsedMilliseconds]);

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
