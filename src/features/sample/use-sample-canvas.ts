'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { ShapePrompt } from '../../domain/prompt/types';
import type { SampleStyle } from '../settings/practice-settings';
import { disposeSample3D, renderSample3D } from './sample-renderer';
import type { SampleRenderLayer } from './types';

type UseSampleCanvasOptions = {
  active: boolean;
  prompt?: ShapePrompt;
  background?: string;
  style?: SampleStyle;
  renderLayer?: SampleRenderLayer;
  sizeSourceRef?: RefObject<HTMLCanvasElement | null>;
};

export function useSampleCanvas({
  active,
  prompt,
  background = '#ffffff',
  style = 'shaded',
  renderLayer = 'complete',
  sizeSourceRef,
}: UseSampleCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!active || !prompt || !canvas) return;
    const activePrompt = prompt;
    function render(target: HTMLCanvasElement) {
      const sourceRect = sizeSourceRef?.current?.getBoundingClientRect();
      renderSample3D(target, activePrompt, style, background, {
        renderLayer,
        width: sourceRect?.width,
        height: sourceRect?.height,
      });
    }

    render(canvas);
    const observer = new ResizeObserver(() => render(canvas));
    observer.observe(sizeSourceRef?.current ?? canvas);
    return () => {
      observer.disconnect();
      disposeSample3D(canvas);
    };
  }, [active, background, prompt, renderLayer, sizeSourceRef, style]);

  return canvasRef;
}
