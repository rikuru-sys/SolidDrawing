import { drawingToSvgDataUrl } from './svg-renderer';
import type { Stroke } from './types';

/**
 * 描画Canvasを白背景のPNGデータURLとして出力する。
 */
export function drawingCanvasToPngDataUrl(
  canvas: HTMLCanvasElement,
  offsetX = 0,
  offsetY = 0,
) {
  const output = document.createElement('canvas');
  output.width = canvas.width;
  output.height = canvas.height;

  const context = output.getContext('2d');
  if (!context) return '';

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, output.width, output.height);
  context.drawImage(
    canvas,
    Math.round(offsetX * output.width),
    Math.round(offsetY * output.height),
  );

  return output.toDataURL('image/png');
}

/**
 * ストロークを現在のCanvas表示サイズに合わせたSVGデータURLとして出力する。
 */
export function drawingCanvasToSvgDataUrl(
  canvas: HTMLCanvasElement,
  strokes: Stroke[],
  offsetX = 0,
  offsetY = 0,
) {
  const bounds = canvas.getBoundingClientRect();

  return drawingToSvgDataUrl(strokes, {
    width: bounds.width || canvas.width || 1,
    height: bounds.height || canvas.height || 1,
    offsetX,
    offsetY,
  });
}
