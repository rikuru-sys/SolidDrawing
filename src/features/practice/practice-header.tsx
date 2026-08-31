import type { ShapePrompt } from '../../domain/prompt/types';
import type { Settings } from '../settings/practice-settings';
import { formatTimerSeconds } from './practice-timer';

type Props = {
  prompt: ShapePrompt;
  questionIndex: number;
  questionCount: number;
  time: Settings['time'];
  remainingSeconds: number;
  elapsedSeconds: number;
  paused: boolean;
  onTogglePaused: () => void;
  onStop: () => void;
};

export function PracticeHeader({ prompt, questionIndex, questionCount, time, remainingSeconds, elapsedSeconds, paused, onTogglePaused, onStop }: Props) {
  return <div className="practice-header">
    <div className="progress-area">
      <div className="progress-label" aria-live="polite" aria-atomic="true"><strong>{questionIndex + 1} / {questionCount}</strong><span>{prompt.shape}</span></div>
      <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={questionCount} aria-valuenow={questionIndex + 1} aria-valuetext={`${questionIndex + 1} / ${questionCount}`} aria-label="練習の進捗">
        <span style={{ width: `${((questionIndex + 1) / questionCount) * 100}%` }} />
      </div>
    </div>
    <div className="timer" role="timer" aria-label={time === null ? '経過時間' : '残り時間'}>
      <small>{time === null ? '経過時間' : '残り時間'}</small>
      <strong>{formatTimerSeconds(time === null ? elapsedSeconds : remainingSeconds)}</strong>
    </div>
    <div className="practice-actions">
      <button className="button secondary compact" type="button" aria-pressed={paused} onClick={onTogglePaused}>{paused ? '再開' : '一時停止'}</button>
      <button className="text-button danger" type="button" onClick={onStop}>終了</button>
    </div>
  </div>;
}
