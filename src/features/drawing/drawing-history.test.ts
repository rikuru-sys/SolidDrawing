import { describe, expect, it } from 'vitest';
import {
  drawingHistoryReducer,
  EMPTY_DRAWING_HISTORY,
} from './drawing-history';
import type { Stroke } from './types';

function stroke(tool: Stroke['tool']): Stroke {
  return {
    tool,
    points: [{ x: 0.1, y: 0.2 }],
    width: 4,
    color: '#111111',
    opacity: 1,
    stabilization: 'off',
  };
}

describe('描画履歴の操作', () => {
  it('追加するとやり直し履歴を破棄する', () => {
    const oldStroke = stroke('pen');
    const newStroke = stroke('dashed');
    const next = drawingHistoryReducer({
      strokes: [oldStroke],
      redoStrokes: [stroke('guide')],
    }, { type: 'add', stroke: newStroke });

    expect(next.strokes).toEqual([oldStroke, newStroke]);
    expect(next.redoStrokes).toEqual([]);
  });

  it('取り消しとやり直しで線の順序を維持する', () => {
    const first = stroke('pen');
    const second = stroke('dashed');
    const undone = drawingHistoryReducer({
      strokes: [first, second],
      redoStrokes: [],
    }, { type: 'undo' });

    expect(undone.strokes).toEqual([first]);
    expect(undone.redoStrokes).toEqual([second]);
    expect(drawingHistoryReducer(undone, { type: 'redo' })).toEqual({
      strokes: [first, second],
      redoStrokes: [],
    });
  });

  it('空の履歴への操作は同じ状態を返す', () => {
    expect(drawingHistoryReducer(EMPTY_DRAWING_HISTORY, { type: 'undo' }))
      .toBe(EMPTY_DRAWING_HISTORY);
    expect(drawingHistoryReducer(EMPTY_DRAWING_HISTORY, { type: 'redo' }))
      .toBe(EMPTY_DRAWING_HISTORY);
    expect(drawingHistoryReducer(EMPTY_DRAWING_HISTORY, { type: 'clear' }))
      .toBe(EMPTY_DRAWING_HISTORY);
  });

  it('消去すると描画履歴とやり直し履歴を空にする', () => {
    const next = drawingHistoryReducer({
      strokes: [stroke('pen')],
      redoStrokes: [stroke('eraser')],
    }, { type: 'clear' });

    expect(next).toBe(EMPTY_DRAWING_HISTORY);
  });
});
