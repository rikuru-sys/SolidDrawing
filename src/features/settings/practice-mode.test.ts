import { describe, expect, it } from 'vitest';
import {
  PRACTICE_MODE_OPTIONS,
  practiceModeDetails,
  usesDrawingCanvas,
} from './practice-mode';

describe('練習モードの定義', () => {
  it('サイト内描画でのみ描画キャンバスを使用する', () => {
    expect(usesDrawingCanvas('canvas')).toBe(true);
    expect(usesDrawingCanvas('sample-only')).toBe(false);
  });

  it('設定画面と一覧表示で使用する文言を提供する', () => {
    expect(PRACTICE_MODE_OPTIONS.map(({ label }) => label)).toEqual([
      'サイト内で描く',
      '見本のみ表示',
    ]);
    expect(practiceModeDetails('canvas').compactLabel).toBe('サイト内描画');
    expect(practiceModeDetails('sample-only').compactLabel).toBe('見本のみ');
  });
});
