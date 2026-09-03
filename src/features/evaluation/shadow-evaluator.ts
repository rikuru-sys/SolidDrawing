import { strictMetricScore, translateMask } from './mask-geometry';
import {
  calculateMaskOverlapRatio,
  countMaskPixels,
  type MaskAlignment,
} from './mask-metrics';

const MINIMUM_SHADOW_PIXELS = 12;
const SHADOW_MATCH_TOLERANCE = 6;

/**
 * 見本と描画の投影影を比較して0〜100点へ変換する。
 *
 * 描画した影だけを独立して中央へ移動すると、立体に対する位置の誤りが
 * 消えてしまう。そのため、形状評価で求めた移動量を影にもそのまま適用する。
 */
export function evaluateShadowMasks(
  sampleMask: Uint8Array,
  drawingMask: Uint8Array,
  size: number,
  shapeAlignment: Pick<MaskAlignment, 'alignmentX' | 'alignmentY'>,
) {
  if (
    countMaskPixels(sampleMask) < MINIMUM_SHADOW_PIXELS
    || countMaskPixels(drawingMask) < MINIMUM_SHADOW_PIXELS
  ) {
    return 0;
  }

  const alignedDrawingMask = translateMask(
    drawingMask,
    size,
    Math.round(shapeAlignment.alignmentX * size),
    Math.round(shapeAlignment.alignmentY * size),
  );
  const overlapRatio = calculateMaskOverlapRatio(
    sampleMask,
    alignedDrawingMask,
    size,
    SHADOW_MATCH_TOLERANCE,
  );

  return strictMetricScore(overlapRatio);
}
