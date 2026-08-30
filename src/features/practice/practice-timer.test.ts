import { describe, expect, it } from 'vitest';
import {
  countdownSnapshot,
  elapsedTimerSeconds,
  formatTimerSeconds,
  practiceDurationSeconds,
} from './practice-timer';

describe('practice timer', () => {
  it('keeps the initial countdown second until a full second has elapsed', () => {
    const deadline = 30_000;

    expect(countdownSnapshot(deadline, 0)).toEqual({
      remainingSeconds: 30,
      complete: false,
    });
    expect(countdownSnapshot(deadline, 1)).toEqual({
      remainingSeconds: 30,
      complete: false,
    });
    expect(countdownSnapshot(deadline, 1_000)).toEqual({
      remainingSeconds: 29,
      complete: false,
    });
  });

  it('completes the countdown once and never returns a negative value', () => {
    expect(countdownSnapshot(30_000, 30_000)).toEqual({
      remainingSeconds: 0,
      complete: true,
    });
    expect(countdownSnapshot(30_000, 35_000)).toEqual({
      remainingSeconds: 0,
      complete: true,
    });
  });

  it('counts elapsed time in whole seconds and resumes from an existing value', () => {
    expect(elapsedTimerSeconds(12, 5_000, 5_999)).toBe(12);
    expect(elapsedTimerSeconds(12, 5_000, 6_000)).toBe(13);
    expect(elapsedTimerSeconds(12, 5_000, 8_450)).toBe(15);
  });

  it('records the configured duration exactly when time expires', () => {
    expect(practiceDurationSeconds({
      timeLimit: 30,
      remainingSeconds: 0,
      elapsedSeconds: 29,
      timedOut: true,
    })).toBe(30);
  });

  it('records manual and unlimited practice durations', () => {
    expect(practiceDurationSeconds({
      timeLimit: 30,
      remainingSeconds: 18,
      elapsedSeconds: 0,
      timedOut: false,
    })).toBe(12);
    expect(practiceDurationSeconds({
      timeLimit: 30,
      remainingSeconds: 30,
      elapsedSeconds: 0,
      timedOut: false,
    })).toBe(1);
    expect(practiceDurationSeconds({
      timeLimit: null,
      remainingSeconds: 0,
      elapsedSeconds: 47,
      timedOut: false,
    })).toBe(47);
  });

  it('formats whole, non-negative seconds for timer displays', () => {
    expect(formatTimerSeconds(0)).toBe('00:00');
    expect(formatTimerSeconds(65.9)).toBe('01:05');
    expect(formatTimerSeconds(-1)).toBe('00:00');
  });
});
