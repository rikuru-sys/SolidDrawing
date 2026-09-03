import { describe, expect, it } from 'vitest';
import { evaluateShapeMasks } from './mask-evaluator';

const SIZE = 180;

/**
 * 四角形のマスクを作る
 * @param minX 左端の座標
 * @param minY 上端の座標
 * @param maxX 右端の座標
 * @param maxY 下端の座標
 */
function rectangleMask(minX: number, minY: number, maxX: number, maxY: number) {
  const mask = new Uint8Array(SIZE * SIZE);
  for (let x = minX; x <= maxX; x += 1) {
    mask[minY * SIZE + x] = 1;
    mask[maxY * SIZE + x] = 1;
  }
  for (let y = minY; y <= maxY; y += 1) {
    mask[y * SIZE + minX] = 1;
    mask[y * SIZE + maxX] = 1;
  }
  return mask;
}

/**
 * 多角形のマスクを作る
 * @param points 多角形の頂点座標の配列
 * @returns 多角形のマスクを表すUint8Array
 */
function polylineMask(points: Array<[number, number]>) {
  const mask = new Uint8Array(SIZE * SIZE);
  points.slice(0, -1).forEach(([startX, startY], index) => {
    const [endX, endY] = points[index + 1];
    const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
    for (let step = 0; step <= steps; step += 1) {
      const progress = steps ? step / steps : 0;
      const x = Math.round(startX + (endX - startX) * progress);
      const y = Math.round(startY + (endY - startY) * progress);
      mask[y * SIZE + x] = 1;
    }
  });
  return mask;
}


describe('evaluateShapeMasks', () => {
  it('完全に一致するマスクは100点', () => {
    const sample = rectangleMask(45, 45, 125, 125);
    const evaluation = evaluateShapeMasks(sample, sample.slice(), SIZE);

    expect(evaluation.score).toBe(100);
    expect(evaluation.outline).toBe(100);
    expect(evaluation.angle).toBe(100);
    expect(evaluation.size).toBe(100);
    expect(evaluation.proportion).toBe(100);
    expect(evaluation.alignmentX).toBe(0);
    expect(evaluation.alignmentY).toBe(0);
  });

  it('中心を一致させ、移動した描画を罰点にしない', () => {
    const sample = rectangleMask(45, 45, 125, 125);
    const translated = rectangleMask(65, 30, 145, 110);
    const evaluation = evaluateShapeMasks(sample, translated, SIZE);

    expect(evaluation.score).toBe(100);
    expect(evaluation.alignmentX).toBeCloseTo(-20 / SIZE);
    expect(evaluation.alignmentY).toBeCloseTo(15 / SIZE);
  });

  it('大きさを評価対象として保持する', () => {
    const sample = rectangleMask(45, 45, 125, 125);
    const larger = rectangleMask(30, 30, 140, 140);
    const evaluation = evaluateShapeMasks(sample, larger, SIZE);

    expect(evaluation.size).toBeLessThan(100);
    expect(evaluation.proportion).toBe(100);
  });

  it('幅と高さの比率を評価する', () => {
    const sample = rectangleMask(45, 45, 125, 125);
    const wide = rectangleMask(30, 60, 140, 110);
    const evaluation = evaluateShapeMasks(sample, wide, SIZE);

    expect(evaluation.proportion).toBeLessThan(70);
  });

  it('角度を評価する', () => {
    const sample = rectangleMask(25, 25, 145, 145);
    const diamond = polylineMask([
      [85, 25],
      [145, 85],
      [85, 145],
      [25, 85],
      [85, 25],
    ]);
    const evaluation = evaluateShapeMasks(sample, diamond, SIZE);

    expect(evaluation.size).toBe(100);
    expect(evaluation.proportion).toBe(100);
    expect(evaluation.angle).toBeLessThan(60);
  });

  it('合計スコアを適切に計算する', () => {
    const sample = rectangleMask(45, 45, 125, 125);
    const wide = rectangleMask(30, 60, 140, 110);
    const evaluation = evaluateShapeMasks(sample, wide, SIZE);

    expect(evaluation.score).toBe(Math.round(
      evaluation.outline * 0.45
      + evaluation.angle * 0.25
      + evaluation.size * 0.2
      + evaluation.proportion * 0.1,
    ));
  });

  it('描画されたピクセルが不足している場合、空の評価を返す', () => {
    const sample = rectangleMask(45, 45, 125, 125);
    const evaluation = evaluateShapeMasks(sample, new Uint8Array(SIZE * SIZE), SIZE);

    expect(evaluation.score).toBe(0);
    expect(evaluation.feedback).toContain('主線が少ない');
  });
});
