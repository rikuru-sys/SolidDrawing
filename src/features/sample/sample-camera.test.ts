import { describe, expect, it } from 'vitest';
import { cameraDistanceToFit } from './sample-camera';

describe('cameraDistanceToFit', () => {
  it('小さい立体では従来の最小距離を保つ', () => {
    expect(cameraDistanceToFit(0.5, 16 / 9)).toBe(5.4);
  });

  it('立体が大きいほどカメラを遠ざける', () => {
    expect(cameraDistanceToFit(1.8, 16 / 9)).toBeGreaterThan(
      cameraDistanceToFit(1.2, 16 / 9),
    );
  });

  it('縦長の画面では狭い横方向の画角に合わせて距離を取る', () => {
    expect(cameraDistanceToFit(1.5, 9 / 16)).toBeGreaterThan(
      cameraDistanceToFit(1.5, 16 / 9),
    );
  });
});
