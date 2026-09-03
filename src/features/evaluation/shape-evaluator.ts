import { applyEvaluationStrokeStyle } from '../drawing/stroke-rendering';
import type { Stroke } from '../drawing/types';
import { evaluateShapeMasks } from './mask-evaluator';
import type { ShapeEvaluation } from './types';

/** 見本と描画を比較するために統一する正方形画像の一辺。 */
const ANALYSIS_SIZE = 180;

/**
 * 見本のみ表示モードで使用する、未評価の結果を作成する。
 *
 * @returns 全項目が0で、自動評価の対象外であることを示す評価結果
 */
export function unevaluatedShape(): ShapeEvaluation {
  return {
    score: 0,
    outline: 0,
    angle: 0,
    size: 0,
    proportion: 0,
    alignmentX: 0,
    alignmentY: 0,
    feedback: '見本のみ表示モードでは、自動形状評価を行いません。',
  };
}

/**
 * Canvasの読み取り準備ができず、評価を実行できない場合の結果を作成する。
 *
 * @returns 全項目が0で、評価を作成できなかったことを示す評価結果
 */
function unavailableEvaluation(): ShapeEvaluation {
  return {
    score: 0,
    outline: 0,
    angle: 0,
    size: 0,
    proportion: 0,
    alignmentX: 0,
    alignmentY: 0,
    feedback: '評価を作成できませんでした。',
  };
}

/**
 * 見本Canvasを解析用サイズへ縮小し、輪郭を表す二値マスクへ変換する。
 *
 * @param context - 見本を解析するための2D描画コンテキスト
 * @param sampleCanvas - 3D見本が描画されているCanvas
 * @returns 0を背景、1を見本の暗部または輪郭として持つ二値マスク
 *
 * @remarks
 * RGBから輝度を求め、暗い部分と周囲との輝度差が大きい部分を評価対象にする。
 * 影付き表示で使う長い水平の地面線は、立体自体の評価に含めない。
 */
function createSampleMask(context: CanvasRenderingContext2D, sampleCanvas: HTMLCanvasElement) {
  const size = ANALYSIS_SIZE;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  context.drawImage(sampleCanvas, 0, 0, size, size);
  const samplePixels = context.getImageData(0, 0, size, size).data;
  const luminance = new Float32Array(size * size);

  // RGBを人の視覚特性に合わせた輝度へ変換する。
  for (let index = 0; index < luminance.length; index += 1) {
    const pixel = index * 4;
    luminance[index] = samplePixels[pixel] * 0.2126
      + samplePixels[pixel + 1] * 0.7152
      + samplePixels[pixel + 2] * 0.0722;
  }

  // 暗い部分、または周囲との輝度差が大きい輪郭を1として記録する。
  const sampleMask = new Uint8Array(size * size);
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const index = y * size + x;
      const value = luminance[index];
      const contrast = Math.max(
        Math.abs(value - luminance[index - 1]),
        Math.abs(value - luminance[index + 1]),
        Math.abs(value - luminance[index - size]),
        Math.abs(value - luminance[index + size]),
      );
      if (value < 150 || (value < 251 && contrast > 9)) sampleMask[index] = 1;
    }
  }

  // 横幅の55%を超える水平線を地面線とみなし、上下1行を含めて除外する。
  for (let y = 1; y < size - 1; y += 1) {
    let rowPixels = 0;
    for (let x = 0; x < size; x += 1) rowPixels += sampleMask[y * size + x];
    if (rowPixels <= size * 0.55) continue;
    for (let targetY = Math.max(0, y - 1); targetY <= Math.min(size - 1, y + 1); targetY += 1) {
      sampleMask.fill(0, targetY * size, (targetY + 1) * size);
    }
  }
  return sampleMask;
}

/**
 * 保存されたストロークを解析用Canvasへ再描画し、二値マスクへ変換する。
 *
 * @param context - 描画線を解析するための2D描画コンテキスト
 * @param strokes - ユーザーが描いたストロークの一覧
 * @returns 0を背景、1を評価対象の描画線として持つ二値マスク
 *
 * @remarks
 * 評価対象外のストロークは`applyEvaluationStrokeStyle`で除外する。
 * 座標は0〜1で保存されているため、解析用サイズを掛けてピクセル座標へ戻す。
 */
function createDrawingMask(context: CanvasRenderingContext2D, strokes: Stroke[]) {
  const size = ANALYSIS_SIZE;
  strokes.forEach((stroke) => {
    if (!stroke.points.length) return;
    context.save();
    if (!applyEvaluationStrokeStyle(context, stroke)) {
      context.restore();
      return;
    }
    if (stroke.points.length === 1) {
      const point = stroke.points[0];
      context.beginPath();
      context.arc(point.x * size, point.y * size, context.lineWidth / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.beginPath();
      context.moveTo(stroke.points[0].x * size, stroke.points[0].y * size);
      stroke.points.slice(1).forEach((point) => context.lineTo(point.x * size, point.y * size));
      context.stroke();
    }
    context.restore();
  });

  // 透明度が十分にあるピクセルだけを描画線として記録する。
  const drawingPixels = context.getImageData(0, 0, size, size).data;
  const drawingMask = new Uint8Array(size * size);
  for (let index = 0; index < drawingMask.length; index += 1) {
    if (drawingPixels[index * 4 + 3] > 24) drawingMask[index] = 1;
  }
  return drawingMask;
}

/**
 * 画面上の見本とユーザーのストロークを、共通の二値マスクへ変換して評価する。
 *
 * @param sampleCanvas - 3D見本が描画されているCanvas
 * @param strokes - ユーザーが描いたストロークの一覧
 * @returns 総合点、項目別得点、中心合わせ情報、助言を含む評価結果
 *
 * @remarks
 * この関数はCanvasとストロークを評価処理へ渡す入口である。
 * 実際の比較と採点は`evaluateShapeMasks`が担当する。
 */
export function evaluateShape(sampleCanvas: HTMLCanvasElement, strokes: Stroke[]): ShapeEvaluation {
  const sampleAnalysis = document.createElement('canvas');
  sampleAnalysis.width = ANALYSIS_SIZE;
  sampleAnalysis.height = ANALYSIS_SIZE;
  const sampleContext = sampleAnalysis.getContext('2d', { willReadFrequently: true });

  const drawingAnalysis = document.createElement('canvas');
  drawingAnalysis.width = ANALYSIS_SIZE;
  drawingAnalysis.height = ANALYSIS_SIZE;
  const drawingContext = drawingAnalysis.getContext('2d', { willReadFrequently: true });

  if (!sampleContext || !drawingContext) return unavailableEvaluation();

  const sampleMask = createSampleMask(sampleContext, sampleCanvas);
  const drawingMask = createDrawingMask(drawingContext, strokes);
  return evaluateShapeMasks(sampleMask, drawingMask, ANALYSIS_SIZE);
}
