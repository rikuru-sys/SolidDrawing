import { describe, expect, it } from 'vitest';
import type { ShapeName } from '../../domain/prompt/types';
import type { SampleStyle } from '../settings/practice-settings';
import { evaluateShapeMasks } from './mask-evaluator';

const SIZE = 180;
const ALL_SHAPES = ['立方体', '直方体', '円柱', '楕円柱', '三角錐', '円錐'] as const satisfies readonly ShapeName[];
const SAMPLE_STYLE_CASES = [
  ['輪郭線と薄い陰影', 'shaded'],
  ['輪郭線と影', 'shadow'],
  ['輪郭線（見えない部分は点線）', 'hidden-lines'],
] as const satisfies ReadonlyArray<readonly [string, SampleStyle]>;

type MaskPoint = readonly [number, number];

/** 二値マスクへ直線を描く。 */
function drawLine(
  mask: Uint8Array,
  [startX, startY]: MaskPoint,
  [endX, endY]: MaskPoint,
  dashed = false,
) {
  const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
  for (let step = 0; step <= steps; step += 1) {
    if (dashed && Math.floor(step / 4) % 2 === 1) continue;
    const progress = steps ? step / steps : 0;
    const x = Math.round(startX + (endX - startX) * progress);
    const y = Math.round(startY + (endY - startY) * progress);
    mask[y * SIZE + x] = 1;
  }
}

/** 二値マスクへ、指定された頂点を順に結ぶ線を描く。 */
function drawPolyline(mask: Uint8Array, points: readonly MaskPoint[], dashed = false) {
  points.slice(0, -1).forEach((start, index) => {
    drawLine(mask, start, points[index + 1], dashed);
  });
}

/** 二値マスクへ楕円弧を描く。角度はCanvasと同じく右端を0とする。 */
function drawEllipseArc(
  mask: Uint8Array,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  startAngle = 0,
  endAngle = Math.PI * 2,
  dashed = false,
) {
  const steps = 180;
  for (let step = 0; step <= steps; step += 1) {
    if (dashed && Math.floor(step / 6) % 2 === 1) continue;
    const angle = startAngle + (endAngle - startAngle) * (step / steps);
    const x = Math.round(centerX + Math.cos(angle) * radiusX);
    const y = Math.round(centerY + Math.sin(angle) * radiusY);
    mask[y * SIZE + x] = 1;
  }
}

/** 四角形のマスクを作る。 */
function rectangleMask(minX: number, minY: number, maxX: number, maxY: number) {
  const mask = new Uint8Array(SIZE * SIZE);
  drawPolyline(mask, [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
    [minX, minY],
  ]);
  return mask;
}

/** 多角形の頂点を順番に結んだマスクを作る。 */
function polylineMask(points: readonly MaskPoint[]) {
  const mask = new Uint8Array(SIZE * SIZE);
  drawPolyline(mask, points);
  return mask;
}

/** 立体ごとの、画面へ投影された代表的な輪郭マスクを作る。 */
function shapeMask(shape: ShapeName) {
  const mask = new Uint8Array(SIZE * SIZE);

  if (shape === '立方体') {
    drawPolyline(mask, [[45, 58], [90, 40], [137, 60], [134, 119], [88, 140], [47, 117], [45, 58]]);
    drawLine(mask, [45, 58], [89, 78]);
    drawLine(mask, [90, 40], [89, 78]);
    drawLine(mask, [137, 60], [89, 78]);
    drawLine(mask, [89, 78], [88, 140]);
    return mask;
  }

  if (shape === '直方体') {
    drawPolyline(mask, [[28, 62], [88, 42], [151, 61], [146, 111], [85, 133], [32, 113], [28, 62]]);
    drawLine(mask, [28, 62], [87, 77]);
    drawLine(mask, [88, 42], [87, 77]);
    drawLine(mask, [151, 61], [87, 77]);
    drawLine(mask, [87, 77], [85, 133]);
    return mask;
  }

  if (shape === '円柱' || shape === '楕円柱') {
    const radiusX = shape === '円柱' ? 40 : 55;
    const radiusY = shape === '円柱' ? 15 : 11;
    const topY = 50;
    const bottomY = 125;
    drawEllipseArc(mask, 90, topY, radiusX, radiusY);
    drawLine(mask, [90 - radiusX, topY], [90 - radiusX, bottomY]);
    drawLine(mask, [90 + radiusX, topY], [90 + radiusX, bottomY]);
    drawEllipseArc(mask, 90, bottomY, radiusX, radiusY, 0, Math.PI);
    return mask;
  }

  if (shape === '三角錐') {
    const apex: MaskPoint = [90, 32];
    const left: MaskPoint = [38, 116];
    const right: MaskPoint = [140, 119];
    const front: MaskPoint = [87, 145];
    drawLine(mask, apex, left);
    drawLine(mask, apex, right);
    drawLine(mask, apex, front);
    drawPolyline(mask, [left, front, right]);
    return mask;
  }

  drawLine(mask, [90, 32], [42, 125]);
  drawLine(mask, [90, 32], [138, 125]);
  drawEllipseArc(mask, 90, 125, 48, 15, 0, Math.PI);
  return mask;
}

/** 点線表示で追加される、見えない部分の代表的な線を描く。 */
function addHiddenLines(mask: Uint8Array, shape: ShapeName) {
  if (shape === '円柱' || shape === '楕円柱') {
    const radiusX = shape === '円柱' ? 40 : 55;
    const radiusY = shape === '円柱' ? 15 : 11;
    drawEllipseArc(mask, 90, 125, radiusX, radiusY, Math.PI, Math.PI * 2, true);
    return;
  }
  if (shape === '円錐') {
    drawEllipseArc(mask, 90, 125, 48, 15, Math.PI, Math.PI * 2, true);
    return;
  }
  if (shape === '三角錐') {
    drawLine(mask, [38, 116], [140, 119], true);
    return;
  }

  drawLine(mask, [47, 117], [134, 119], true);
}

/** 立体と描写モードの組み合わせに対応する評価用マスクを作る。 */
function sampleStyleMask(shape: ShapeName, style: SampleStyle) {
  const mask = shapeMask(shape);
  // 影モードは評価専用Canvasで投影影を描かないため、立体の線だけを使用する。
  if (style === 'hidden-lines') addHiddenLines(mask, shape);
  return mask;
}

describe('evaluateShapeMasks', () => {
  describe('各立体・各描写モード', () => {
    describe.each(ALL_SHAPES)('%s', (shape) => {
      it.each(SAMPLE_STYLE_CASES)('%sで同じ形を比較すると全項目が100点になる', (_label, style) => {
        const sample = sampleStyleMask(shape, style);
        const evaluation = evaluateShapeMasks(sample, sample.slice(), SIZE);

        expect(evaluation).toMatchObject({
          score: 100,
          outline: 100,
          angle: 100,
          size: 100,
          proportion: 100,
          alignmentX: 0,
          alignmentY: 0,
        });
      });
    });
  });

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
