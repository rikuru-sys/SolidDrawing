'use client';

import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
} from 'react';

/**
 * ペンや消しゴムの大きさを示すカーソルの位置と表示状態を管理する。
 */
export function useBrushCursor(paused: boolean) {
  const brushCursorRef = useRef<HTMLDivElement>(null);

  const updateBrushCursor = useCallback((
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const cursor = brushCursorRef.current;
    if (!cursor) return;

    if (event.pointerType === 'touch' || paused) {
      cursor.style.opacity = '0';
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    cursor.style.left = `${event.clientX - bounds.left}px`;
    cursor.style.top = `${event.clientY - bounds.top}px`;
    cursor.style.opacity = '1';
  }, [paused]);

  const hideBrushCursor = useCallback(() => {
    if (brushCursorRef.current) {
      brushCursorRef.current.style.opacity = '0';
    }
  }, []);

  return {
    brushCursorRef,
    updateBrushCursor,
    hideBrushCursor,
  };
}
