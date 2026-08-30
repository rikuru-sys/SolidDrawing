import type { Stroke } from './types';

export type DrawingHistory = {
  strokes: Stroke[];
  redoStrokes: Stroke[];
};

export type DrawingHistoryAction =
  | { type: 'add'; stroke: Stroke }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clear' }
  | { type: 'discard-redo' };

export const EMPTY_DRAWING_HISTORY: DrawingHistory = {
  strokes: [],
  redoStrokes: [],
};

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
