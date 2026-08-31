'use client';

import { useEffect, useRef } from 'react';
import type { ShapePrompt } from '../../domain/prompt/types';
import type { SampleStyle } from '../settings/practice-settings';
import { disposeSample3D, renderSample3D } from './sample-renderer';

type UseSampleCanvasOptions = {
  active: boolean;
  prompt?: ShapePrompt;
  background?: string;
  style?: SampleStyle;
};

export function useSampleCanvas({
  active,
  prompt,
  background = '#ffffff',
  style = 'shaded',
}: UseSampleCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!active || !prompt || !canvas) return;
    const render = () => renderSample3D(canvas, prompt, style, background);
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      disposeSample3D(canvas);
    };
  }, [active, background, prompt, style]);

  return canvasRef;
}
