'use client';

import { useCallback, type RefObject } from 'react';
import type { ShapePrompt } from '../../domain/prompt/types';
import type { Stroke } from '../drawing/types';
import { captureAttempt } from '../results/attempt-capture';
import type { Attempt } from '../results/types';
import type { PracticeMode } from '../settings/practice-settings';

type UseAttemptFinisherOptions = {
  prompt?: ShapePrompt;
  practiceMode: PracticeMode;
  evaluatesShadow: boolean;
  sampleCanvasRef: RefObject<HTMLCanvasElement | null>;
  shapeEvaluationCanvasRef: RefObject<HTMLCanvasElement | null>;
  shadowEvaluationCanvasRef: RefObject<HTMLCanvasElement | null>;
  beginFinishing: () => boolean;
  finishAttempt: (attempt: Attempt, endSession?: boolean) => boolean;
  getDurationSeconds: (timedOut: boolean) => number;
  getCurrentStrokes: () => Stroke[];
  exportDrawing: (offsetX?: number, offsetY?: number) => string;
  exportDrawingSvg: (
    strokes: Stroke[],
    offsetX?: number,
    offsetY?: number,
  ) => string;
  releaseActivePointer: () => void;
  resetDrawing: () => void;
  onComplete: () => void;
};

/** 現在のCanvasとストロークから試行結果を作り、次問または結果画面へ進める。 */
export function useAttemptFinisher({
  prompt,
  practiceMode,
  evaluatesShadow,
  sampleCanvasRef,
  shapeEvaluationCanvasRef,
  shadowEvaluationCanvasRef,
  beginFinishing,
  finishAttempt,
  getDurationSeconds,
  getCurrentStrokes,
  exportDrawing,
  exportDrawingSvg,
  releaseActivePointer,
  resetDrawing,
  onComplete,
}: UseAttemptFinisherOptions) {
  return useCallback((endSession = false, timedOut = false) => {
    const sampleCanvas = sampleCanvasRef.current;
    const evaluationSampleCanvas = evaluatesShadow
      ? shapeEvaluationCanvasRef.current
      : sampleCanvas;
    const shadowEvaluationSampleCanvas = evaluatesShadow
      ? shadowEvaluationCanvasRef.current
      : undefined;

    if (
      !prompt
      || !sampleCanvas
      || !evaluationSampleCanvas
      || (evaluatesShadow && !shadowEvaluationSampleCanvas)
      || !beginFinishing()
    ) return;

    const attempt = captureAttempt({
      prompt,
      sampleCanvas,
      evaluationSampleCanvas,
      shadowEvaluationSampleCanvas: shadowEvaluationSampleCanvas ?? undefined,
      practiceMode,
      seconds: getDurationSeconds(timedOut),
      getCurrentStrokes,
      exportDrawing,
      exportDrawingSvg,
    });

    releaseActivePointer();
    if (finishAttempt(attempt, endSession)) {
      onComplete();
      return;
    }
    resetDrawing();
  }, [
    beginFinishing,
    evaluatesShadow,
    exportDrawing,
    exportDrawingSvg,
    finishAttempt,
    getCurrentStrokes,
    getDurationSeconds,
    onComplete,
    practiceMode,
    prompt,
    releaseActivePointer,
    resetDrawing,
    sampleCanvasRef,
    shadowEvaluationCanvasRef,
    shapeEvaluationCanvasRef,
  ]);
}
