import type { ShapeEvaluation } from '../evaluation/types';

type Props = { evaluation: ShapeEvaluation };

export function EvaluationPanel({ evaluation }: Props) {
  const level = evaluation.score >= 80 ? 'high' : evaluation.score >= 60 ? 'medium' : 'low';
  const evaluatesShadow = evaluation.shadow !== null;
  return <div className={`evaluation-summary ${level}`}>
    <div className="evaluation-score"><strong>{evaluation.score}</strong><span>点</span></div>
    <div className="evaluation-copy"><strong>{evaluatesShadow ? '自動形状・影評価' : '自動形状評価'}</strong><p>{evaluation.feedback}</p><small>{evaluatesShadow ? '形状の位置だけを合わせ、輪郭36%・傾き20%・大きさ16%・比率8%・影20%で評価します。' : '位置だけを合わせ、輪郭45%・傾き25%・大きさ20%・比率10%で細かなずれも評価します。'}</small></div>
    <dl className={`evaluation-metrics${evaluatesShadow ? ' with-shadow' : ''}`}>
      <div><dt>輪郭</dt><dd>{evaluation.outline}</dd></div><div><dt>傾き</dt><dd>{evaluation.angle}</dd></div><div><dt>大きさ</dt><dd>{evaluation.size}</dd></div><div><dt>比率</dt><dd>{evaluation.proportion}</dd></div>
      {evaluation.shadow !== null && <div><dt>影</dt><dd>{evaluation.shadow}</dd></div>}
    </dl>
  </div>;
}
