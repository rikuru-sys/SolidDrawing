'use client';

import type { ShapePrompt } from '../../domain/prompt/types';
import { useSampleCanvas } from '../sample/use-sample-canvas';
import type { SampleStyle } from '../settings/practice-settings';

type UsePracticeSampleCanvasesOptions = {
  active: boolean;
  prompt?: ShapePrompt;
  style: SampleStyle;
  evaluatesShadow: boolean;
};

/** 練習表示用と形状・影評価用の3D見本Canvasを準備する。 */
export function usePracticeSampleCanvases({
  active,
  prompt,
  style,
  evaluatesShadow,
}: UsePracticeSampleCanvasesOptions) {
  const sample = useSampleCanvas({
    active,
    prompt,
    style,
  });
  const shapeEvaluation = useSampleCanvas({
    active: active && evaluatesShadow,
    prompt,
    style,
    renderLayer: 'shape',
    sizeSourceRef: sample.canvasRef,
  });
  const shadowEvaluation = useSampleCanvas({
    active: active && evaluatesShadow,
    prompt,
    style,
    renderLayer: 'shadow',
    sizeSourceRef: sample.canvasRef,
  });

  return {
    sampleCanvasRef: sample.canvasRef,
    shapeEvaluationCanvasRef: shapeEvaluation.canvasRef,
    shadowEvaluationCanvasRef: shadowEvaluation.canvasRef,
    sampleRenderError: sample.renderError
      || shapeEvaluation.renderError
      || shadowEvaluation.renderError,
    retrySampleRender() {
      sample.retryRender();
      shapeEvaluation.retryRender();
      shadowEvaluation.retryRender();
    },
  };
}
