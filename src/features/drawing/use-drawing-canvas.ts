'use client';

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import { redrawDrawingCanvas } from './drawing-canvas-renderer';
import {
  drawingCanvasToPngDataUrl,
  drawingCanvasToSvgDataUrl,
} from './drawing-export';
import {
  drawingHistoryReducer,
  EMPTY_DRAWING_HISTORY,
} from './drawing-history';
import type { DrawingToolId, Stabilization, Stroke } from './types';
import { useBrushCursor } from './use-brush-cursor';
import { useDrawingPointer } from './use-drawing-pointer';

/**
 * 描画Canvasの動作を設定する値。
 */
type UseDrawingCanvasOptions = {
  /** 練習画面が表示され、Canvasを描画できる状態か */
  active: boolean;
  /** 練習が一時停止中か */
  paused: boolean;
  /** 設定したペンの太さ（ピクセル単位） */
  penWidth: number;
  /** 設定したペンの色（CSSカラー形式） */
  penColor: string;
  /** 設定したペンの不透明度（0〜1） */
  penOpacity: number;
  /** 手振れ補正の強さ */
  stabilization: Stabilization;
};

/**
 * 描画履歴、Canvas表示、ポインター入力、画像出力を接続するカスタムフック。
 * @returns 描画Canvasの状態と操作を提供するオブジェクト
 */
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
  const strokesRef = useRef<Stroke[]>([]);

  const {
    brushCursorRef,
    updateBrushCursor,
    hideBrushCursor,
  } = useBrushCursor(paused);

  const {
    beginStroke,
    continueStroke,
    endStroke,
    getCurrentStrokes,
    releaseActivePointer,
  } = useDrawingPointer({
    canvasRef: drawingCanvasRef,
    strokesRef,
    dispatch,
    paused,
    tool,
    penWidth,
    penColor,
    penOpacity,
    stabilization,
    updateBrushCursor,
  });

  const redrawDrawing = useCallback((nextStrokes = strokesRef.current) => {
    const canvas = drawingCanvasRef.current;
    if (canvas) redrawDrawingCanvas(canvas, nextStrokes);
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

  const exportDrawing = useCallback((offsetX = 0, offsetY = 0) => {
    const canvas = drawingCanvasRef.current;
    return canvas
      ? drawingCanvasToPngDataUrl(canvas, offsetX, offsetY)
      : '';
  }, []);

  const exportDrawingSvg = useCallback((
    strokesToExport: Stroke[],
    offsetX = 0,
    offsetY = 0,
  ) => {
    const canvas = drawingCanvasRef.current;
    return canvas
      ? drawingCanvasToSvgDataUrl(canvas, strokesToExport, offsetX, offsetY)
      : '';
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
