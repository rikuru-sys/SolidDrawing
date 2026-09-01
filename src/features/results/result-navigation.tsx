import { practiceModeDetails, usesDrawingCanvas } from '../settings/practice-mode';
import type { Attempt } from './types';

type Props = { attempts: Attempt[]; selectedResult: number; onSelectResult: (index: number) => void };

export function ResultNavigation({ attempts, selectedResult, onSelectResult }: Props) {
  return <nav className="result-list" aria-label="確認する問題">{attempts.map((attempt, index) => {
    const resultLabel = usesDrawingCanvas(attempt.practiceMode)
      ? `評価 ${attempt.evaluation.score}点`
      : practiceModeDetails(attempt.practiceMode).compactLabel;
    return <button
      key={attempt.prompt.id}
      className={selectedResult === index ? 'result-item selected' : 'result-item'}
      type="button"
      aria-pressed={selectedResult === index}
      onClick={() => onSelectResult(index)}
    >
      <strong>{index + 1}　{attempt.prompt.shape}</strong>
      <span>{attempt.seconds}秒・{resultLabel}</span>
    </button>;
  })}</nav>;
}
