import { describe, expect, it } from 'vitest';
import {
  allResultsCanvasSize,
  calculateResultAverages,
  containedImageRect,
  formatFileTimestamp,
  resultFileName,
} from './result-export';

const DATE = new Date(2026, 7, 30, 9, 45);

describe('result export helpers', () => {
  it('centers an image without changing its aspect ratio', () => {
    expect(containedImageRect(400, 200, 10, 20, 300, 300)).toEqual({
      x: 10,
      y: 95,
      width: 300,
      height: 150,
    });
  });

  it('formats the Japanese file timestamp to minutes', () => {
    expect(formatFileTimestamp(DATE)).toBe('2026年08月30日_09時45分');
  });

  it('builds names for each result export type', () => {
    expect(resultFileName('comparison', {
      index: 1,
      shape: '三角錐',
      mode: 'side-by-side',
      date: DATE,
    })).toBe('立体ドローイング_比較_2_三角錐_2026年08月30日_09時45分.png');
    expect(resultFileName('comparison', {
      index: 0,
      shape: '円柱',
      mode: 'overlay',
      date: DATE,
    })).toContain('立体ドローイング_重ね合わせ_1_円柱_');
    expect(resultFileName('drawing', { index: 0, shape: '立方体', date: DATE })).toContain('_描画_1_立方体_');
    expect(resultFileName('sample', { index: 0, shape: '立方体', date: DATE })).toContain('_見本_1_立方体_');
    expect(resultFileName('all', { date: DATE })).toBe('立体ドローイング_全結果_2026年08月30日_09時45分.png');
    expect(resultFileName('all', { mode: 'overlay', date: DATE })).toBe('立体ドローイング_全結果_重ね合わせ_2026年08月30日_09時45分.png');
  });

  it('fits two questions (four sample/drawing panes) per row, including an odd final question', () => {
    expect(allResultsCanvasSize(0)).toEqual({ width: 1600, height: 180, rowCount: 0 });
    expect(allResultsCanvasSize(1)).toEqual({ width: 1600, height: 610, rowCount: 1 });
    expect(allResultsCanvasSize(2)).toEqual({ width: 1600, height: 610, rowCount: 1 });
    expect(allResultsCanvasSize(3)).toEqual({ width: 1600, height: 1060, rowCount: 2 });
    expect(allResultsCanvasSize(10)).toEqual({ width: 1600, height: 2410, rowCount: 5 });
  });

  it('fits four overlaid questions per row with room for the evaluation text', () => {
    expect(allResultsCanvasSize(0, 'overlay')).toEqual({ width: 1600, height: 180, rowCount: 0 });
    expect(allResultsCanvasSize(1, 'overlay')).toEqual({ width: 1600, height: 660, rowCount: 1 });
    expect(allResultsCanvasSize(4, 'overlay')).toEqual({ width: 1600, height: 660, rowCount: 1 });
    expect(allResultsCanvasSize(5, 'overlay')).toEqual({ width: 1600, height: 1160, rowCount: 2 });
    expect(allResultsCanvasSize(10, 'overlay')).toEqual({ width: 1600, height: 1660, rowCount: 3 });
  });

  it('calculates drawing-time and evaluation averages', () => {
    const attempts = [
      { seconds: 20, evaluation: { score: 60, outline: 50, angle: 40, size: 70, proportion: 80, shadow: null } },
      { seconds: 30, evaluation: { score: 80, outline: 70, angle: 60, size: 90, proportion: 100, shadow: 50 } },
    ];

    expect(calculateResultAverages(attempts)).toEqual({
      seconds: 25,
      score: 70,
      outline: 60,
      angle: 50,
      size: 80,
      proportion: 90,
      shadow: 50,
    });
  });
});
