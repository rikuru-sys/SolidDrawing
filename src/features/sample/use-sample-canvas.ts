'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
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
  const [renderAttempt, setRenderAttempt] = useState(0);
  const request = useMemo(() => ({
    active, prompt, background, style, renderLayer, sizeSourceRef, renderAttempt,
  }), [active, prompt, background, style, renderLayer, sizeSourceRef, renderAttempt]);
  const [result, setResult] = useState<{ request: typeof request; error: unknown | null } | null>(null);
  const renderReady = active && result?.request === request && result.error === null;
  const renderError = result?.request === request && result.error !== null;

  const retryRender = useCallback(() => {
    setRenderAttempt((current) => current + 1);
  }, []);

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
      }, (error) => setResult({ request, error }));
    }

    render(canvas);
    const observer = new ResizeObserver(() => render(canvas));
    observer.observe(sizeSourceRef?.current ?? canvas);
    return () => {
      observer.disconnect();
      disposeSample3D(canvas);
    };
  }, [active, background, prompt, request, renderLayer, sizeSourceRef, style]);

  return { canvasRef, renderError, renderReady, retryRender };
}
