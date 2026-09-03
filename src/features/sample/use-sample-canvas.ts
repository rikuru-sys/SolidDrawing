'use client';

import { useEffect, useRef } from 'react';
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
};

export function useSampleCanvas({
  active,
  prompt,
  background = '#ffffff',
  style = 'shaded',
  renderLayer = 'complete',
}: UseSampleCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!active || !prompt || !canvas) return;
    const activePrompt = prompt;
    function render(target: HTMLCanvasElement) {
      renderSample3D(target, activePrompt, style, background, {
        renderLayer,
      });
    }

    render(canvas);
    const observer = new ResizeObserver(() => render(canvas));
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      disposeSample3D(canvas);
    };
  }, [active, background, prompt, renderLayer, style]);

  return canvasRef;
}
