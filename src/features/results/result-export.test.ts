import { describe, expect, it } from 'vitest';
import {
  allResultsCanvasSize,
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
    expect(resultFileName('all', { mode: 'overlay', date: DATE })).toContain('_全結果_重ね合わせ_');
  });

  it('uses two columns and grows the canvas by result rows', () => {
    expect(allResultsCanvasSize(1)).toEqual({ width: 1600, height: 580, columnCount: 2, rowCount: 1 });
    expect(allResultsCanvasSize(2)).toEqual({ width: 1600, height: 580, columnCount: 2, rowCount: 1 });
    expect(allResultsCanvasSize(3)).toEqual({ width: 1600, height: 1030, columnCount: 2, rowCount: 2 });
  });
});
