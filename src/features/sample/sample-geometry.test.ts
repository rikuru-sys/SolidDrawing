import { describe, expect, it } from 'vitest';
import type { ShapeName } from '../../domain/prompt/types';
import { createShapeGeometry, isRoundedShape } from './sample-geometry';
import type { ThreeShapePrompt } from './types';

function prompt(shape: ShapeName): ThreeShapePrompt {
  return {
    shape,
    widthScale: 1,
    heightScale: 1,
    depthScale: 1,
    cameraAzimuth: 0,
    cameraElevation: 0,
    objectRotationX: 0,
    objectRotationY: 0,
    objectRotationZ: 0,
    lightDirection: 'top-left',
  };
}

describe('sample geometry', () => {
  it('6種類すべての形状を生成できる', () => {
    const shapes: ShapeName[] = ['立方体', '直方体', '円柱', '楕円柱', '三角錐', '円錐'];
    const geometries = shapes.map((shape) => createShapeGeometry(prompt(shape)));

    geometries.forEach((geometry) => {
      expect(geometry.getAttribute('position').count).toBeGreaterThan(0);
      geometry.dispose();
    });
  });

  it('三角錐は4頂点・4面の独自形状として生成する', () => {
    const geometry = createShapeGeometry(prompt('三角錐'));

    expect(geometry.getAttribute('position').count).toBe(4);
    expect(geometry.index?.count).toBe(12);
    expect(geometry.getAttribute('normal').count).toBe(4);
    geometry.dispose();
  });

  it('曲面を持つ形状だけを輪郭補強の対象にする', () => {
    expect(isRoundedShape('円柱')).toBe(true);
    expect(isRoundedShape('楕円柱')).toBe(true);
    expect(isRoundedShape('円錐')).toBe(true);
    expect(isRoundedShape('立方体')).toBe(false);
    expect(isRoundedShape('三角錐')).toBe(false);
  });
});
