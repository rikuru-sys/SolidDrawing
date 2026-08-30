import {
  dilateMask,
  lineAngleMatch,
  maskBounds,
  maskMatch,
  strictMetricScore,
  translateMask,
} from './mask-geometry';
import type { ShapeEvaluation } from './types';

function emptyDrawingEvaluation(): ShapeEvaluation {
  return {
    score: 0,
    outline: 0,
    angle: 0,
    size: 0,
    proportion: 0,
    alignmentX: 0,
    alignmentY: 0,
    feedback: '評価できる主線が少ないため、ペンで輪郭をもう少し描いてみましょう。',
  };
}

/**
 * Scores two binary shape masks. Canvas and future SVG adapters can share
 * this position-independent, scale-preserving comparison boundary.
 */
export function evaluateShapeMasks(
  sampleMask: Uint8Array,
  drawingMask: Uint8Array,
  size: number,
): ShapeEvaluation {
  const sampleBounds = maskBounds(sampleMask, size);
  const drawingBounds = maskBounds(drawingMask, size);
  const drawnPixelCount = drawingMask.reduce((total, value) => total + value, 0);
  if (!sampleBounds || !drawingBounds || drawnPixelCount < 12) return emptyDrawingEvaluation();

  // Match only the centers. Deliberately keep the drawing at its original scale so size remains scorable.
  const alignmentX = (sampleBounds.centerX - drawingBounds.centerX) / size;
  const alignmentY = (sampleBounds.centerY - drawingBounds.centerY) / size;
  const centeredDrawingMask = translateMask(
    drawingMask,
    size,
    Math.round(alignmentX * size),
    Math.round(alignmentY * size),
  );
  const tolerance = 5;
  const precision = maskMatch(centeredDrawingMask, dilateMask(sampleMask, size, tolerance));
  const recall = maskMatch(sampleMask, dilateMask(centeredDrawingMask, size, tolerance));
  const outlineRatio = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  const angleRatio = lineAngleMatch(sampleMask, centeredDrawingMask, size, tolerance) ?? outlineRatio;
  const widthRatio = Math.min(sampleBounds.width, drawingBounds.width)
    / Math.max(sampleBounds.width, drawingBounds.width);
  const heightRatio = Math.min(sampleBounds.height, drawingBounds.height)
    / Math.max(sampleBounds.height, drawingBounds.height);
  const sampleAspect = sampleBounds.width / sampleBounds.height;
  const drawingAspect = drawingBounds.width / drawingBounds.height;
  const aspectRatio = Math.min(sampleAspect, drawingAspect) / Math.max(sampleAspect, drawingAspect);
  const sizeRatio = (widthRatio + heightRatio) / 2;
  const outline = strictMetricScore(outlineRatio);
  const angle = strictMetricScore(angleRatio);
  const sizeScore = strictMetricScore(sizeRatio);
  const proportion = strictMetricScore(aspectRatio);
  const score = Math.round(outline * 0.45 + angle * 0.25 + sizeScore * 0.2 + proportion * 0.1);

  let feedback = '輪郭・線の傾き・大きさ・比率がよく合っています。重ね合わせでも細部を確認しましょう。';
  if (outline < 45) feedback = '見本の角や曲線を追い、輪郭線の方向をそろえると近づきます。';
  else if (angle < 60) feedback = '水平線・垂直線・斜線の傾きを、見本の辺と見比べてみましょう。';
  else if (sizeScore < 70) feedback = '形を拡大・縮小せず見比べ、見本と同じ大きさを意識してみましょう。';
  else if (proportion < 70) feedback = '全体の縦横比を見比べてみましょう。';
  else if (score < 80) feedback = '形はおおむね合っています。重ね合わせでずれた辺を確認しましょう。';

  return {
    score,
    outline,
    angle,
    size: sizeScore,
    proportion,
    alignmentX,
    alignmentY,
    feedback,
  };
}
