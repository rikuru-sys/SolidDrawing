import { applyEvaluationStrokeStyle } from '../drawing/stroke-rendering';
import type { Stroke } from '../drawing/types';
import { evaluateShapeMasks } from './mask-evaluator';
import type { ShapeEvaluation } from './types';

const ANALYSIS_SIZE = 180;

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

function createSampleMask(context: CanvasRenderingContext2D, sampleCanvas: HTMLCanvasElement) {
  const size = ANALYSIS_SIZE;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  context.drawImage(sampleCanvas, 0, 0, size, size);
  const samplePixels = context.getImageData(0, 0, size, size).data;
  const luminance = new Float32Array(size * size);
  for (let index = 0; index < luminance.length; index += 1) {
    const pixel = index * 4;
    luminance[index] = samplePixels[pixel] * 0.2126
      + samplePixels[pixel + 1] * 0.7152
      + samplePixels[pixel + 2] * 0.0722;
  }

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

  // The shadow style includes a long ground line. Ignore it so the score focuses on the solid itself.
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

  const drawingPixels = context.getImageData(0, 0, size, size).data;
  const drawingMask = new Uint8Array(size * size);
  for (let index = 0; index < drawingMask.length; index += 1) {
    if (drawingPixels[index * 4 + 3] > 24) drawingMask[index] = 1;
  }
  return drawingMask;
}

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
