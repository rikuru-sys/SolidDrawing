import type { Stroke } from './types';

// ストロークの履歴を表す
export type DrawingHistory = {
  strokes: Stroke[];
  redoStrokes: Stroke[];
};

// ストロークの履歴に対する操作を表すアクションの型
export type DrawingHistoryAction =
  | { type: 'add'; stroke: Stroke }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clear' }
  | { type: 'discard-redo' };


// 描画履歴の初期状態を表す定数
export const EMPTY_DRAWING_HISTORY: DrawingHistory = {
  strokes: [],
  redoStrokes: [],
};

/**
 * 描画履歴の状態を更新するためのリデューサー関数
 * @param state - 現在の描画履歴の状態
 * @param action - 描画履歴に対する操作を表すアクション
 * @returns 更新後の描画履歴の状態
 */
export function drawingHistoryReducer(
  state: DrawingHistory,
  action: DrawingHistoryAction,
): DrawingHistory {
  switch (action.type) {
    case 'add':
      return {
        strokes: [...state.strokes, action.stroke],
        redoStrokes: [],
      };
    case 'undo': {
      const stroke = state.strokes.at(-1);
      if (!stroke) return state;
      return {
        strokes: state.strokes.slice(0, -1),
        redoStrokes: [...state.redoStrokes, stroke],
      };
    }
    case 'redo': {
      const stroke = state.redoStrokes.at(-1);
      if (!stroke) return state;
      return {
        strokes: [...state.strokes, stroke],
        redoStrokes: state.redoStrokes.slice(0, -1),
      };
    }
    case 'discard-redo':
      return state.redoStrokes.length
        ? { strokes: state.strokes, redoStrokes: [] }
        : state;
    case 'clear':
      return state.strokes.length || state.redoStrokes.length
        ? EMPTY_DRAWING_HISTORY
        : state;
  }
}
