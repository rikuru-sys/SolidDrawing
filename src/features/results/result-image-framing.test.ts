import { describe, expect, it } from 'vitest';
import { sharedImageBounds, visibleImageBounds } from './result-image-framing';

describe('export image framing', () => {
  it('ignores transparent pixels and white background but keeps faint strokes', () => {
    const data = new Uint8ClampedArray(20 * 20 * 4).fill(255);
    data.set([0, 0, 0, 0], 0);
    data.set([245, 245, 245, 255], (5 * 20 + 8) * 4);
    data.set([0, 0, 0, 128], (12 * 20 + 14) * 4);
    expect(visibleImageBounds({ data, width: 20, height: 20 })).toEqual({ x: 8, y: 5, width: 7, height: 8 });
  });
  it('uses the union of sample, drawing and shadow extents with breathing room', () => {
    const crop = sharedImageBounds([
      { x: 400, y: 400, width: 100, height: 150 },
      { x: 480, y: 410, width: 200, height: 150 },
    ], 1000, 1000);
    expect(crop.x).toBeLessThan(400);
    expect(crop.y).toBeLessThan(400);
    expect(crop.x + crop.width).toBeGreaterThan(680);
    expect(crop.y + crop.height).toBeGreaterThan(560);
    expect(crop.width).toBeLessThan(350);
  });
  it('retains marks at all four edges without reading outside the image', () => {
    expect(sharedImageBounds([{ x: 0, y: 0, width: 1000, height: 800 }], 1000, 800))
      .toEqual({ x: 0, y: 0, width: 1000, height: 800 });
  });
  it('handles blank drawings and fully blank comparisons', () => {
    expect(visibleImageBounds({ data: new Uint8ClampedArray(16).fill(255), width: 2, height: 2 })).toBeNull();
    expect(sharedImageBounds([null, null], 100, 80)).toEqual({ x: 0, y: 0, width: 100, height: 80 });
    expect(sharedImageBounds([null, { x: 30, y: 30, width: 20, height: 20 }], 100, 80))
      .toEqual({ x: 26, y: 26, width: 28, height: 28 });
  });
});
