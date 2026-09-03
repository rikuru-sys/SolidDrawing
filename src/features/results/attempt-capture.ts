import type { ShapePrompt } from '../../domain/prompt/types';
import type { Stroke } from '../drawing/types';
import {
  evaluateShape,
  unevaluatedShape,
} from '../evaluation/shape-evaluator';
import type { ShapeEvaluation } from '../evaluation/types';
import { usesDrawingCanvas } from '../settings/practice-mode';
import type { PracticeMode } from '../settings/practice-settings';
import type { Attempt } from './types';

type ExportDrawing = (offsetX?: number, offsetY?: number) => string;
type ExportDrawingSvg = (strokes: Stroke[], offsetX?: number, offsetY?: number) => string;

type DrawingAssets = Pick<
  Attempt,
  'drawingImage' | 'alignedDrawingImage' | 'drawingSvg' | 'alignedDrawingSvg'
>;

type CaptureDrawingAssetsOptions = {
  practiceMode: PracticeMode;
  strokes: Stroke[];
  evaluation: ShapeEvaluation;
  exportDrawing: ExportDrawing;
  exportDrawingSvg: ExportDrawingSvg;
};

type CaptureAttemptOptions = {
  prompt: ShapePrompt;
  /** 結果画像として保存する、画面に表示されている見本Canvas。 */
  sampleCanvas: HTMLCanvasElement;
  /** 形状評価に使用する見本Canvas。影表示では立体だけを含む。 */
  evaluationSampleCanvas?: HTMLCanvasElement;
  /** 影評価に使用する、投影影だけを含む見本Canvas。 */
  shadowEvaluationSampleCanvas?: HTMLCanvasElement;
  practiceMode: PracticeMode;
  seconds: number;
  getCurrentStrokes: () => Stroke[];
  exportDrawing: ExportDrawing;
  exportDrawingSvg: ExportDrawingSvg;
};

/** 描画モードに応じて、通常表示用と中心合わせ用のPNG・SVGを作成する。 */
export function captureDrawingAssets({
  practiceMode,
  strokes,
  evaluation,
  exportDrawing,
  exportDrawingSvg,
}: CaptureDrawingAssetsOptions): DrawingAssets {
  if (!usesDrawingCanvas(practiceMode)) {
    return {
      drawingImage: '',
      alignedDrawingImage: '',
      drawingSvg: '',
      alignedDrawingSvg: '',
    };
  }

  return {
    drawingImage: exportDrawing(),
    alignedDrawingImage: exportDrawing(evaluation.alignmentX, evaluation.alignmentY),
    drawingSvg: exportDrawingSvg(strokes),
    alignedDrawingSvg: exportDrawingSvg(
      strokes,
      evaluation.alignmentX,
      evaluation.alignmentY,
    ),
  };
}

/** 現在の見本と描画を評価し、結果画面で使用する1回分のデータを作成する。 */
export function captureAttempt({
  prompt,
  sampleCanvas,
  evaluationSampleCanvas = sampleCanvas,
  shadowEvaluationSampleCanvas,
  practiceMode,
  seconds,
  getCurrentStrokes,
  exportDrawing,
  exportDrawingSvg,
}: CaptureAttemptOptions): Attempt {
  const strokes = getCurrentStrokes();
  const evaluation = usesDrawingCanvas(practiceMode)
    ? evaluateShape(evaluationSampleCanvas, strokes, shadowEvaluationSampleCanvas)
    : unevaluatedShape();

  return {
    prompt,
    sampleImage: sampleCanvas.toDataURL('image/png'),
    ...captureDrawingAssets({
      practiceMode,
      strokes,
      evaluation,
      exportDrawing,
      exportDrawingSvg,
    }),
    seconds,
    evaluation,
    practiceMode,
  };
}
