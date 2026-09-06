import { describe, expect, it } from 'vitest';
import { lineAngleMatch } from './mask-geometry';

const SIZE = 180;
type Point = readonly [number, number];

function emptyMask() {
  return new Uint8Array(SIZE * SIZE);
}

function drawLine(mask: Uint8Array, start: Point, end: Point, width = 1) {
  const steps = Math.max(Math.abs(end[0] - start[0]), Math.abs(end[1] - start[1]));
  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(start[0] + (end[0] - start[0]) * (step / steps));
    const y = Math.round(start[1] + (end[1] - start[1]) * (step / steps));
    const radius = Math.floor(width / 2);
    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        const targetX = x + offsetX;
        const targetY = y + offsetY;
        if (targetX < 0 || targetX >= SIZE || targetY < 0 || targetY >= SIZE) continue;
        mask[targetY * SIZE + targetX] = 1;
      }
    }
  }
}

function polyline(points: readonly Point[], width = 1) {
  const mask = emptyMask();
  for (let index = 0; index < points.length - 1; index += 1) {
    drawLine(mask, points[index], points[index + 1], width);
  }
  return mask;
}

function rectangle(left: number, top: number, right: number, bottom: number, width = 1) {
  return polyline([
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
    [left, top],
  ], width);
}

function ellipse(centerX: number, centerY: number, radiusX: number, radiusY: number) {
  const points: Point[] = [];
  for (let step = 0; step <= 160; step += 1) {
    const angle = Math.PI * 2 * (step / 160);
    points.push([
      Math.round(centerX + Math.cos(angle) * radiusX),
      Math.round(centerY + Math.sin(angle) * radiusY),
    ]);
  }
  return polyline(points);
}

describe('lineAngleMatch', () => {
  it('縦線のX座標が異なっても評価対象から欠落しない', () => {
    const sample = polyline([[45, 25], [45, 145]]);
    const moved = polyline([[46, 25], [46, 145]]);

    expect(lineAngleMatch(sample, moved, SIZE)).toBeGreaterThan(0.99);
  });

  it('同じ形を移動しても傾き評価は下がらない', () => {
    const sample = rectangle(35, 45, 125, 125);
    const moved = rectangle(55, 25, 145, 105);

    expect(lineAngleMatch(sample, moved, SIZE)).toBeGreaterThan(0.95);
  });

  it('同じ形を拡大しても傾き評価は下がらない', () => {
    const sample = rectangle(45, 45, 125, 125);
    const enlarged = rectangle(25, 25, 145, 145);

    expect(lineAngleMatch(sample, enlarged, SIZE)).toBeGreaterThan(0.95);
  });

  it('縦横比が変わっても水平線と垂直線の傾きは一致する', () => {
    const sample = rectangle(45, 45, 125, 125);
    const wide = rectangle(20, 65, 155, 105);

    expect(lineAngleMatch(sample, wide, SIZE)).toBeGreaterThan(0.95);
  });

  it('線幅が変わっても同じ方向として評価する', () => {
    const sample = rectangle(45, 45, 125, 125, 1);
    const thick = rectangle(45, 45, 125, 125, 5);

    expect(lineAngleMatch(sample, thick, SIZE)).toBeGreaterThan(0.9);
  });

  it('位置と大きさが異なる楕円でも方向分布を比較できる', () => {
    const sample = ellipse(85, 85, 48, 20);
    const movedAndScaled = ellipse(105, 70, 36, 15);

    expect(lineAngleMatch(sample, movedAndScaled, SIZE)).toBeGreaterThan(0.9);
  });

  it('辺の方向が異なる四角形は低く評価する', () => {
    const sample = rectangle(35, 35, 135, 135);
    const diamond = polyline([
      [85, 25],
      [145, 85],
      [85, 145],
      [25, 85],
      [85, 25],
    ]);

    expect(lineAngleMatch(sample, diamond, SIZE)).toBeLessThan(0.6);
  });
});
