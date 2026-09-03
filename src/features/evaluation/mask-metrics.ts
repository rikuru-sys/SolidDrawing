import {
  dilateMask,
  lineAngleMatch,
  maskMatch,
  strictMetricScore,
  translateMask,
} from './mask-geometry';
import type { ShapeEvaluation } from './types';

/** 二値マスクを囲む最小の長方形の寸法と中心座標。 */
export type MaskBounds = {
  /** 外接矩形の幅（ピクセル単位）。 */
  width: number;
  /** 外接矩形の高さ（ピクセル単位）。 */
  height: number;
  /** 外接矩形の中心のX座標。 */
  centerX: number;
  /** 外接矩形の中心のY座標。 */
  centerY: number;
};

/** 見本と描画の中心を合わせた結果。 */
export type MaskAlignment = {
  /** 大きさを変えず、見本の中心へ移動した描画マスク。 */
  centeredMask: Uint8Array;
  /** 描画を見本へ合わせる水平方向の移動量。マスクサイズに対する比率。 */
  alignmentX: number;
  /** 描画を見本へ合わせる垂直方向の移動量。マスクサイズに対する比率。 */
  alignmentY: number;
};

/** 自動形状評価で使用する4項目の得点。 */
export type ShapeMetricScores = Pick<
  ShapeEvaluation,
  'outline' | 'angle' | 'size' | 'proportion'
>;

/**
 * 二値マスクに含まれる評価対象ピクセルの数を求める。
 *
 * @param mask - 0を背景、1を評価対象として持つ二値マスク
 * @returns 値が1になっているピクセルの合計
 */
export function countMaskPixels(mask: Uint8Array) {
  return mask.reduce((total, value) => total + value, 0);
}

/**
 * 描画マスクの大きさを変えず、見本マスクと中心だけを合わせる。
 *
 * @param drawingMask - 移動する描画マスク
 * @param sampleBounds - 見本マスクの外接矩形
 * @param drawingBounds - 描画マスクの外接矩形
 * @param size - 正方形マスクの一辺のピクセル数
 * @returns 中心合わせ後の描画マスクと、正規化した移動量
 *
 * @remarks
 * 大きさを評価対象として残すため、拡大・縮小は行わず平行移動だけを行う。
 */
export function alignDrawingMask(
  drawingMask: Uint8Array,
  sampleBounds: MaskBounds,
  drawingBounds: MaskBounds,
  size: number,
): MaskAlignment {
  const alignmentX = (sampleBounds.centerX - drawingBounds.centerX) / size;
  const alignmentY = (sampleBounds.centerY - drawingBounds.centerY) / size;

  return {
    centeredMask: translateMask(
      drawingMask,
      size,
      Math.round(alignmentX * size),
      Math.round(alignmentY * size),
    ),
    alignmentX,
    alignmentY,
  };
}

/**
 * 見本と描画の輪郭が、許容距離の範囲内で一致している割合を求める。
 *
 * @param sampleMask - 見本の二値マスク
 * @param drawingMask - 中心合わせ後の描画の二値マスク
 * @param size - 正方形マスクの一辺のピクセル数
 * @param tolerance - 線のずれを許容する距離（ピクセル単位）
 * @returns 描き足しと描き漏らしの両方を考慮した輪郭一致率
 */
function calculateOutlineRatio(
  sampleMask: Uint8Array,
  drawingMask: Uint8Array,
  size: number,
  tolerance: number,
) {
  // 描画線のうち、見本線の近くにある割合。不要な描き足しが多いほど下がる。
  const precision = maskMatch(
    drawingMask,
    dilateMask(sampleMask, size, tolerance),
  );

  // 見本線のうち、描画線で再現できている割合。描き漏らしが多いほど下がる。
  const recall = maskMatch(
    sampleMask,
    dilateMask(drawingMask, size, tolerance),
  );

  // 片方だけが高い場合に過大評価しないよう、2つの調和平均を使う。
  return precision + recall
    ? (2 * precision * recall) / (precision + recall)
    : 0;
}

/**
 * 見本線と描画線の傾きを比較し、0〜100点へ変換する。
 *
 * @param sampleMask - 見本の二値マスク
 * @param drawingMask - 中心合わせ後の描画の二値マスク
 * @param size - 正方形マスクの一辺のピクセル数
 * @param tolerance - 対応する見本線を探す距離（ピクセル単位）
 * @param outlineRatio - 傾きを判定できない場合に代用する輪郭一致率
 * @returns 線の傾きの評価点（0〜100）
 */
function calculateAngleScore(
  sampleMask: Uint8Array,
  drawingMask: Uint8Array,
  size: number,
  tolerance: number,
  outlineRatio: number,
) {
  const angleRatio = lineAngleMatch(
    sampleMask,
    drawingMask,
    size,
    tolerance,
  ) ?? outlineRatio;

  return strictMetricScore(angleRatio);
}

/**
 * 2つの正の長さがどの程度一致しているかを求める。
 *
 * @param first - 比較する1つ目の長さ
 * @param second - 比較する2つ目の長さ
 * @returns 短い方を長い方で割った一致率（0〜1）
 */
function calculateLengthRatio(first: number, second: number) {
  return Math.min(first, second) / Math.max(first, second);
}

/**
 * 外接矩形の幅と高さから、見本と描画が同じ大きさかを評価する。
 *
 * @param sampleBounds - 見本マスクの外接矩形
 * @param drawingBounds - 描画マスクの外接矩形
 * @returns 幅と高さの一致率を平均した評価点（0〜100）
 */
function calculateSizeScore(
  sampleBounds: MaskBounds,
  drawingBounds: MaskBounds,
) {
  const widthRatio = calculateLengthRatio(
    sampleBounds.width,
    drawingBounds.width,
  );
  const heightRatio = calculateLengthRatio(
    sampleBounds.height,
    drawingBounds.height,
  );

  return strictMetricScore((widthRatio + heightRatio) / 2);
}

/**
 * 外接矩形の縦横比から、見本と描画の形の比率を評価する。
 *
 * @param sampleBounds - 見本マスクの外接矩形
 * @param drawingBounds - 描画マスクの外接矩形
 * @returns 縦横比の評価点（0〜100）
 */
function calculateProportionScore(
  sampleBounds: MaskBounds,
  drawingBounds: MaskBounds,
) {
  const sampleAspect = sampleBounds.width / sampleBounds.height;
  const drawingAspect = drawingBounds.width / drawingBounds.height;

  return strictMetricScore(calculateLengthRatio(sampleAspect, drawingAspect));
}

/**
 * 中心合わせ後のマスクと、移動前の外接矩形から4項目の得点を計算する。
 *
 * @param sampleMask - 見本の二値マスク
 * @param centeredDrawingMask - 見本の中心へ移動済みの描画マスク
 * @param sampleBounds - 見本マスクの外接矩形
 * @param drawingBounds - 移動前の描画マスクの外接矩形
 * @param size - 正方形マスクの一辺のピクセル数
 * @param tolerance - 輪郭と対応線の探索に使う許容距離（ピクセル単位）
 * @returns 輪郭・傾き・大きさ・比率の評価点
 *
 * @remarks
 * 輪郭と傾きには中心合わせ後のマスクを使用する。大きさと比率には
 * 移動前の外接矩形を使用するため、位置のずれを除外しつつ寸法差は評価できる。
 */
export function calculateShapeMetricScores(
  sampleMask: Uint8Array,
  centeredDrawingMask: Uint8Array,
  sampleBounds: MaskBounds,
  drawingBounds: MaskBounds,
  size: number,
  tolerance: number,
): ShapeMetricScores {
  const outlineRatio = calculateOutlineRatio(
    sampleMask,
    centeredDrawingMask,
    size,
    tolerance,
  );

  return {
    outline: strictMetricScore(outlineRatio),
    angle: calculateAngleScore(
      sampleMask,
      centeredDrawingMask,
      size,
      tolerance,
      outlineRatio,
    ),
    size: calculateSizeScore(sampleBounds, drawingBounds),
    proportion: calculateProportionScore(sampleBounds, drawingBounds),
  };
}
