import { createShapeEvaluation } from './evaluation-result';
import { maskBounds } from './mask-geometry';
import {
  alignDrawingMask,
  calculateShapeMetricScores,
  countMaskPixels,
} from './mask-metrics';
import type { ShapeEvaluation } from './types';

/** 評価できる描画とみなすために必要な最小ピクセル数。 */
const MINIMUM_DRAWING_PIXELS = 12;
/** 輪郭のずれと対応線の探索で許容するピクセル数。 */
const MATCH_TOLERANCE = 5;

/**
 * 描画量が足りず、自動評価できない場合の結果を作成する。
 *
 * @returns 全項目を0点とし、描き足しを促すメッセージを含む評価結果
 */
function emptyDrawingEvaluation(): ShapeEvaluation {
  return {
    score: 0,
    outline: 0,
    angle: 0,
    size: 0,
    proportion: 0,
    shadow: null,
    alignmentX: 0,
    alignmentY: 0,
    feedback: '評価できる主線が少ないため、ペンで輪郭をもう少し描いてみましょう。',
  };
}

/**
 * 見本と描画の二値マスクを比較し、位置に依存しない形状評価を作成する。
 *
 * @param sampleMask - 0を背景、1を見本の評価対象として持つ二値マスク
 * @param drawingMask - 0を背景、1を描画線として持つ二値マスク
 * @param size - 正方形マスクの一辺のピクセル数
 * @returns 総合点、4項目の点数、中心合わせの移動量、助言を含む評価結果
 *
 * @remarks
 * 処理は「外接矩形の取得 → 描画量の確認 → 中心合わせ → 4項目の採点
 * → 総合結果の作成」の順に進む。中心合わせでは拡大・縮小を行わないため、
 * 描いた位置は採点から除外しつつ、大きさの違いは評価に残る。
 */
export function evaluateShapeMasks(
  sampleMask: Uint8Array,
  drawingMask: Uint8Array,
  size: number,
): ShapeEvaluation {
  // 1. 見本と描画を囲む長方形から、大きさと中心位置を取得する。
  const sampleBounds = maskBounds(sampleMask, size);
  const drawingBounds = maskBounds(drawingMask, size);
  const hasEnoughDrawing = countMaskPixels(drawingMask) >= MINIMUM_DRAWING_PIXELS;

  // 2. 比較対象が存在しない、または描画量が少なすぎる場合は採点しない。
  if (!sampleBounds || !drawingBounds || !hasEnoughDrawing) {
    return emptyDrawingEvaluation();
  }

  // 3. 描画の大きさは維持したまま、見本と描画の中心だけを合わせる。
  const alignment = alignDrawingMask(
    drawingMask,
    sampleBounds,
    drawingBounds,
    size,
  );

  // 4. 中心合わせ後の輪郭・傾きと、元の大きさ・比率を採点する。
  const scores = calculateShapeMetricScores(
    sampleMask,
    alignment.centeredMask,
    sampleBounds,
    drawingBounds,
    size,
    MATCH_TOLERANCE,
  );

  // 5. 項目別得点を総合点とフィードバックへまとめる。
  return createShapeEvaluation(scores, alignment);
}
