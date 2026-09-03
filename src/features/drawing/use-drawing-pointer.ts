'use client';

import {
  Dispatch,
  PointerEvent as ReactPointerEvent,
  RefObject,
  useCallback,
  useRef,
} from 'react';
import { appendAndPaintStrokePoint, normalizeCanvasPoint } from './drawing-canvas-renderer';
import type { DrawingHistoryAction } from './drawing-history';
import { stabilizeStrokePoint } from './stabilization';
import { createDrawingStroke } from './tools/tool-registry';
import type { DrawingToolId, Stabilization, Stroke } from './types';

type UseDrawingPointerOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  strokesRef: RefObject<Stroke[]>;
  dispatch: Dispatch<DrawingHistoryAction>;
  paused: boolean;
  tool: DrawingToolId;
  penWidth: number;
  penColor: string;
  penOpacity: number;
  stabilization: Stabilization;
  updateBrushCursor: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
};

/**
 * Pointer Eventsからストロークの開始・継続・終了を組み立てる。
 */
export function useDrawingPointer({
  canvasRef,
  strokesRef,
  dispatch,
  paused,
  tool,
  penWidth,
  penColor,
  penOpacity,
  stabilization,
  updateBrushCursor,
}: UseDrawingPointerOptions) {
  const activeStrokeRef = useRef<Stroke | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const beginStroke = useCallback((
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    if (paused) return;

    updateBrushCursor(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;

    const bounds = event.currentTarget.getBoundingClientRect();
    activeStrokeRef.current = createDrawingStroke(tool, {
      point: normalizeCanvasPoint(event.clientX, event.clientY, bounds),
      width: penWidth,
      color: penColor,
      opacity: penOpacity,
      stabilization,
    });
    dispatch({ type: 'discard-redo' });
  }, [
    dispatch,
    paused,
    penColor,
    penOpacity,
    penWidth,
    stabilization,
    tool,
    updateBrushCursor,
  ]);

  const continueStroke = useCallback((
    event: ReactPointerEvent<HTMLCanvasElement>,
    finishing = false,
  ) => {
    updateBrushCursor(event);

    const stroke = activeStrokeRef.current;
    const canvas = canvasRef.current;
    if (!stroke || !canvas || paused) return;

    const bounds = canvas.getBoundingClientRect();
    const previousPoint = stroke.points[stroke.points.length - 1];
    const rawPoint = normalizeCanvasPoint(event.clientX, event.clientY, bounds);
    const nextPoint = stabilizeStrokePoint(
      previousPoint,
      rawPoint,
      stroke.stabilization,
      bounds.width,
      bounds.height,
      finishing,
    );

    const movement = Math.hypot(
      nextPoint.x - previousPoint.x,
      nextPoint.y - previousPoint.y,
    );
    if (movement < 0.0001) return;

    appendAndPaintStrokePoint(canvas, stroke, nextPoint);
  }, [canvasRef, paused, updateBrushCursor]);

  const endStroke = useCallback((
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const stroke = activeStrokeRef.current;
    if (stroke && event.type === 'pointerup') {
      continueStroke(event, true);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activePointerIdRef.current = null;

    if (!stroke) return;
    activeStrokeRef.current = null;
    dispatch({ type: 'add', stroke });
  }, [continueStroke, dispatch]);

  const releaseActivePointer = useCallback(() => {
    const pointerId = activePointerIdRef.current;
    const canvas = canvasRef.current;

    if (canvas && pointerId !== null && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }

    activeStrokeRef.current = null;
    activePointerIdRef.current = null;
  }, [canvasRef]);

  const getCurrentStrokes = useCallback(() => {
    const activeStroke = activeStrokeRef.current;
    return activeStroke
      ? [...strokesRef.current, activeStroke]
      : strokesRef.current;
  }, [strokesRef]);

  return {
    beginStroke,
    continueStroke,
    endStroke,
    releaseActivePointer,
    getCurrentStrokes,
  };
}
