'use client';

import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  drawingHistoryReducer,
  EMPTY_DRAWING_HISTORY,
} from './drawing-history';
import { stabilizeStrokePoint } from './stabilization';
import { applyStrokeStyle } from './stroke-rendering';
import { drawingToSvgDataUrl } from './svg-renderer';
import { createDrawingStroke, getDrawingTool } from './tools/tool-registry';
import type { DrawingToolId, Point, Stabilization, Stroke } from './types';

type UseDrawingCanvasOptions = {
  active: boolean;
  paused: boolean;
  penWidth: number;
  penColor: string;
  penOpacity: number;
  stabilization: Stabilization;
};

function canvasPoint(event: ReactPointerEvent<HTMLCanvasElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
  };
}

function paintStroke(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  width: number,
  height: number,
) {
  if (!stroke.points.length) return;
  context.save();
  applyStrokeStyle(context, stroke);
  if (stroke.points.length === 1) {
    context.beginPath();
    context.arc(
      stroke.points[0].x * width,
      stroke.points[0].y * height,
      context.lineWidth / 2,
      0,
      Math.PI * 2,
    );
    context.fill();
  } else {
    context.beginPath();
    context.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
    stroke.points.slice(1).forEach((point) => {
      context.lineTo(point.x * width, point.y * height);
    });
    context.stroke();
  }
  context.restore();
}

export function useDrawingCanvas({
  active,
  paused,
  penWidth,
  penColor,
  penOpacity,
  stabilization,
}: UseDrawingCanvasOptions) {
  const [tool, setTool] = useState<DrawingToolId>('pen');
  const [history, dispatch] = useReducer(
    drawingHistoryReducer,
    EMPTY_DRAWING_HISTORY,
  );
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const brushCursorRef = useRef<HTMLDivElement>(null);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const strokesRef = useRef<Stroke[]>([]);

  const redrawDrawing = useCallback((nextStrokes = strokesRef.current) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    nextStrokes.forEach((stroke) => {
      paintStroke(context, stroke, rect.width, rect.height);
    });
  }, []);

  useEffect(() => {
    strokesRef.current = history.strokes;
    if (active) redrawDrawing(history.strokes);
  }, [active, history.strokes, redrawDrawing]);

  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!active || !canvas) return;
    const observer = new ResizeObserver(() => redrawDrawing());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [active, redrawDrawing]);

  const updateBrushCursor = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const cursor = brushCursorRef.current;
    if (!cursor) return;
    if (event.pointerType === 'touch' || paused) {
      cursor.style.opacity = '0';
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    cursor.style.left = `${event.clientX - rect.left}px`;
    cursor.style.top = `${event.clientY - rect.top}px`;
    cursor.style.opacity = '1';
  }, [paused]);

  const hideBrushCursor = useCallback(() => {
    if (brushCursorRef.current) brushCursorRef.current.style.opacity = '0';
  }, []);

  const beginStroke = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    updateBrushCursor(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    activeStrokeRef.current = createDrawingStroke(tool, {
      point: canvasPoint(event),
      width: penWidth,
      color: penColor,
      opacity: penOpacity,
      stabilization,
    });
    dispatch({ type: 'discard-redo' });
  }, [paused, penColor, penOpacity, penWidth, stabilization, tool, updateBrushCursor]);

  const continueStroke = useCallback((
    event: ReactPointerEvent<HTMLCanvasElement>,
    finishing = false,
  ) => {
    updateBrushCursor(event);
    const stroke = activeStrokeRef.current;
    const canvas = drawingCanvasRef.current;
    if (!stroke || !canvas || paused) return;
    const rawPoint = canvasPoint(event);
    const previousPoint = stroke.points[stroke.points.length - 1];
    const rect = canvas.getBoundingClientRect();
    const nextPoint = stabilizeStrokePoint(
      previousPoint,
      rawPoint,
      stroke.stabilization,
      rect.width,
      rect.height,
      finishing,
    );
    if (Math.hypot(nextPoint.x - previousPoint.x, nextPoint.y - previousPoint.y) < 0.0001) return;
    const strokeTool = getDrawingTool(stroke.tool);
    const dashOffset = strokeTool.continuesDashPattern
      ? stroke.points.slice(1).reduce((total, point, index) => {
        const start = stroke.points[index];
        return total + Math.hypot(
          (point.x - start.x) * rect.width,
          (point.y - start.y) * rect.height,
        );
      }, 0)
      : 0;
    stroke.points.push(nextPoint);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.save();
    applyStrokeStyle(context, stroke);
    if (strokeTool.continuesDashPattern) context.lineDashOffset = -dashOffset;
    context.beginPath();
    context.moveTo(previousPoint.x * rect.width, previousPoint.y * rect.height);
    context.lineTo(nextPoint.x * rect.width, nextPoint.y * rect.height);
    context.stroke();
    context.restore();
  }, [paused, updateBrushCursor]);

  const endStroke = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = activeStrokeRef.current;
    if (stroke && event.type === 'pointerup') continueStroke(event, true);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activePointerIdRef.current = null;
    if (!stroke) return;
    activeStrokeRef.current = null;
    dispatch({ type: 'add', stroke });
  }, [continueStroke]);

  const releaseActivePointer = useCallback(() => {
    const pointerId = activePointerIdRef.current;
    const canvas = drawingCanvasRef.current;
    if (canvas && pointerId !== null && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
    activeStrokeRef.current = null;
    activePointerIdRef.current = null;
  }, []);

  const resetDrawing = useCallback(() => {
    releaseActivePointer();
    strokesRef.current = [];
    dispatch({ type: 'clear' });
    redrawDrawing([]);
  }, [redrawDrawing, releaseActivePointer]);

  const undo = useCallback(() => {
    dispatch({ type: 'undo' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'redo' });
  }, []);

  const getCurrentStrokes = useCallback(() => {
    const activeStroke = activeStrokeRef.current;
    return activeStroke
      ? [...strokesRef.current, activeStroke]
      : strokesRef.current;
  }, []);

  const exportDrawing = useCallback((offsetX = 0, offsetY = 0) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return '';
    const output = document.createElement('canvas');
    output.width = canvas.width;
    output.height = canvas.height;
    const context = output.getContext('2d');
    if (!context) return '';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(
      canvas,
      Math.round(offsetX * output.width),
      Math.round(offsetY * output.height),
    );
    return output.toDataURL('image/png');
  }, []);

  const exportDrawingSvg = useCallback((
    strokesToExport: Stroke[],
    offsetX = 0,
    offsetY = 0,
  ) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return '';
    const bounds = canvas.getBoundingClientRect();
    return drawingToSvgDataUrl(strokesToExport, {
      width: bounds.width || canvas.width || 1,
      height: bounds.height || canvas.height || 1,
      offsetX,
      offsetY,
    });
  }, []);

  return {
    tool,
    setTool,
    strokes: history.strokes,
    redoStrokes: history.redoStrokes,
    drawingCanvasRef,
    brushCursorRef,
    updateBrushCursor,
    hideBrushCursor,
    beginStroke,
    continueStroke,
    endStroke,
    undo,
    redo,
    clear: resetDrawing,
    resetDrawing,
    getCurrentStrokes,
    releaseActivePointer,
    exportDrawing,
    exportDrawingSvg,
  };
}
