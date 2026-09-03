import { applyStrokeStyle } from './stroke-rendering';
import { getDrawingTool } from './tools/tool-registry';
import type { Point, Stroke } from './types';

type CanvasBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * 画面上の座標を、描画領域内の0〜1の相対座標へ変換する。
 */
export function normalizeCanvasPoint(
  clientX: number,
  clientY: number,
  bounds: CanvasBounds,
): Point {
  const width = bounds.width || 1;
  const height = bounds.height || 1;

  return {
    x: Math.max(0, Math.min(1, (clientX - bounds.left) / width)),
    y: Math.max(0, Math.min(1, (clientY - bounds.top) / height)),
  };
}

/**
 * ストロークの長さを、現在のCanvas表示サイズに合わせたピクセル値で求める。
 */
export function calculateStrokeLength(
  points: readonly Point[],
  width: number,
  height: number,
) {
  return points.slice(1).reduce((total, point, index) => {
    const start = points[index];
    return total + Math.hypot(
      (point.x - start.x) * width,
      (point.y - start.y) * height,
    );
  }, 0);
}

/**
 * 保存済みの1ストロークをCanvasへ描画する。
 */
export function paintStroke(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  width: number,
  height: number,
) {
  if (!stroke.points.length) return;

  context.save();
  applyStrokeStyle(context, stroke);

  if (stroke.points.length === 1) {
    context.beginPath();
    context.arc(
      stroke.points[0].x * width,
      stroke.points[0].y * height,
      context.lineWidth / 2,
      0,
      Math.PI * 2,
    );
    context.fill();
  } else {
    context.beginPath();
    context.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
    stroke.points.slice(1).forEach((point) => {
      context.lineTo(point.x * width, point.y * height);
    });
    context.stroke();
  }

  context.restore();
}

/**
 * 入力中のストロークへ点を追加し、増えた線分だけをCanvasへ描画する。
 */
export function appendAndPaintStrokePoint(
  canvas: HTMLCanvasElement,
  stroke: Stroke,
  nextPoint: Point,
) {
  const previousPoint = stroke.points[stroke.points.length - 1];
  const bounds = canvas.getBoundingClientRect();
  const tool = getDrawingTool(stroke.tool);
  const dashOffset = tool.continuesDashPattern
    ? calculateStrokeLength(stroke.points, bounds.width, bounds.height)
    : 0;

  stroke.points.push(nextPoint);

  const context = canvas.getContext('2d');
  if (!context) return;

  context.save();
  applyStrokeStyle(context, stroke);
  if (tool.continuesDashPattern) context.lineDashOffset = -dashOffset;
  context.beginPath();
  context.moveTo(previousPoint.x * bounds.width, previousPoint.y * bounds.height);
  context.lineTo(nextPoint.x * bounds.width, nextPoint.y * bounds.height);
  context.stroke();
  context.restore();
}

/**
 * Canvasの表示サイズに内部解像度を合わせ、全ストロークを再描画する。
 */
export function redrawDrawingCanvas(
  canvas: HTMLCanvasElement,
  strokes: readonly Stroke[],
) {
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(bounds.width * ratio);
  canvas.height = Math.round(bounds.height * ratio);

  const context = canvas.getContext('2d');
  if (!context) return;

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);
  strokes.forEach((stroke) => {
    paintStroke(context, stroke, bounds.width, bounds.height);
  });
}
