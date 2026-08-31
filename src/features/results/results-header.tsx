import { formatTimerSeconds } from '../practice/practice-timer';
import type { Attempt } from './types';

type Props = { attempts: Attempt[]; onRetryCurrent: () => void; onRetrySession: () => void };

export function ResultsHeader({ attempts, onRetryCurrent, onRetrySession }: Props) {
  const sessionSeconds = attempts.reduce((total, attempt) => total + attempt.seconds, 0);
  const resultSeed = attempts[0]?.prompt.generation?.seed;
  return <div className="results-heading">
    <div><h2>練習結果</h2><div className="result-meta">
      <span>{attempts.length}回完了</span><span>合計 {formatTimerSeconds(sessionSeconds)}</span>
      {resultSeed !== undefined && <span>シード {resultSeed}</span>}
      <span>{new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date())}</span>
    </div></div>
    <div className="button-row">
      <button className="button secondary" type="button" onClick={onRetryCurrent}>今回と同じ立体でもう一度</button>
      <button className="button primary" type="button" onClick={onRetrySession}>同じ設定でもう一度</button>
    </div>
  </div>;
}
