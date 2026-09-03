import type { MaskAlignment, ShapeMetricScores } from './mask-metrics';
import type { ShapeEvaluation } from './types';

/**
 * 最も改善の余地がある評価項目に応じて、練習用の助言を作成する。
 *
 * @param scores - 輪郭・傾き・大きさ・比率の評価点
 * @param totalScore - 重み付きで計算した総合点
 * @returns 評価結果画面に表示する助言
 *
 * @remarks
 * 条件は上から順に判定するため、複数項目が基準を下回る場合は
 * 輪郭、傾き、大きさ、比率の順で最初に該当した助言を返す。
 */
function createFeedback(scores: ShapeMetricScores, totalScore: number) {
  if (scores.outline < 45) {
    return '見本の角や曲線を追い、輪郭線の方向をそろえると近づきます。';
  }
  if (scores.angle < 60) {
    return '水平線・垂直線・斜線の傾きを、見本の辺と見比べてみましょう。';
  }
  if (scores.size < 70) {
    return '形を拡大・縮小せず見比べ、見本と同じ大きさを意識してみましょう。';
  }
  if (scores.proportion < 70) {
    return '全体の縦横比を見比べてみましょう。';
  }
  if (totalScore < 80) {
    return '形はおおむね合っています。重ね合わせでずれた辺を確認しましょう。';
  }
  return '輪郭・線の傾き・大きさ・比率がよく合っています。重ね合わせでも細部を確認しましょう。';
}

/**
 * 項目別得点と中心合わせ情報を、画面で使用する評価結果へまとめる。
 *
 * @param scores - 輪郭・傾き・大きさ・比率の評価点
 * @param alignment - 中心合わせ後のマスクと、合わせるために必要だった移動量
 * @returns 総合点、項目別得点、移動量、助言を含む評価結果
 *
 * @remarks
 * 総合点の重みは、輪郭45%、傾き25%、大きさ20%、比率10%。
 */
export function createShapeEvaluation(
  scores: ShapeMetricScores,
  alignment: MaskAlignment,
): ShapeEvaluation {
  const totalScore = Math.round(
    scores.outline * 0.45
    + scores.angle * 0.25
    + scores.size * 0.2
    + scores.proportion * 0.1,
  );

  return {
    score: totalScore,
    ...scores,
    alignmentX: alignment.alignmentX,
    alignmentY: alignment.alignmentY,
    feedback: createFeedback(scores, totalScore),
  };
}
