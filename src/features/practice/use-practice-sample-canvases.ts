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
  const sampleCanvasRef = useSampleCanvas({
    active,
    prompt,
    style,
  });
  const shapeEvaluationCanvasRef = useSampleCanvas({
    active: active && evaluatesShadow,
    prompt,
    style,
    renderLayer: 'shape',
  });
  const shadowEvaluationCanvasRef = useSampleCanvas({
    active: active && evaluatesShadow,
    prompt,
    style,
    renderLayer: 'shadow',
  });

  return {
    sampleCanvasRef,
    shapeEvaluationCanvasRef,
    shadowEvaluationCanvasRef,
  };
}
