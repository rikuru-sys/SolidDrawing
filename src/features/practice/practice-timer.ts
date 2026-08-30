export type CountdownSnapshot = {
  remainingSeconds: number;
  complete: boolean;
};

export type PracticeDurationInput = {
  timeLimit: number | null;
  remainingSeconds: number;
  elapsedSeconds: number;
  timedOut: boolean;
};

export function countdownSnapshot(deadlineMilliseconds: number, nowMilliseconds: number): CountdownSnapshot {
  const millisecondsLeft = deadlineMilliseconds - nowMilliseconds;
  if (millisecondsLeft <= 0) {
    return { remainingSeconds: 0, complete: true };
  }
  return {
    remainingSeconds: Math.ceil(millisecondsLeft / 1000),
    complete: false,
  };
}

export function elapsedTimerSeconds(
  startingElapsedSeconds: number,
  startedAtMilliseconds: number,
  nowMilliseconds: number,
) {
  const elapsedMilliseconds = Math.max(0, nowMilliseconds - startedAtMilliseconds);
  return Math.floor(Math.max(0, startingElapsedSeconds) + elapsedMilliseconds / 1000);
}

export function practiceDurationSeconds({
  timeLimit,
  remainingSeconds,
  elapsedSeconds,
  timedOut,
}: PracticeDurationInput) {
  if (timeLimit === null) return Math.max(0, Math.floor(elapsedSeconds));
  if (timedOut) return timeLimit;
  return Math.max(1, timeLimit - Math.max(0, remainingSeconds));
}
