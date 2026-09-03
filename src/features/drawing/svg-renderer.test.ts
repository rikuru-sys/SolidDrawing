import { describe, expect, it } from 'vitest';
import { createDrawingStroke } from './tools/tool-registry';
import type { Stroke } from './types';
import { drawingToSvg, drawingToSvgDataUrl } from './svg-renderer';

/**
 * ヘルパー関数: 指定された描画ツールとポイントでストロークを作成する
 * @param tool - 使用する描画ツールのID ('pen', 'dashed', 'guide', 'eraser')
 * @param points - ストロークを構成するポイントの配列
 * @returns 作成されたストロークオブジェクト
 */
function stroke(tool: 'pen' | 'dashed' | 'guide' | 'eraser', points: Stroke['points']) {
  const drawingStroke = createDrawingStroke(tool, {
    point: points[0],
    width: 3,
    color: '#30322c',
    opacity: 0.8,
    stabilization: 'low',
  });
  drawingStroke.points = points;
  return drawingStroke;
}

describe('SVGを生成する', () => {
  it('ペン、点線、補助線のストロークが正しくベクターパスに変換されることを確認する', () => {
    const svg = drawingToSvg([
      stroke('pen', [{ x: 0.1, y: 0.2 }, { x: 0.5, y: 0.6 }]),
      stroke('dashed', [{ x: 0.2, y: 0.3 }, { x: 0.6, y: 0.7 }]),
      stroke('guide', [{ x: 0.3, y: 0.4 }, { x: 0.7, y: 0.8 }]),
    ], { width: 400, height: 300 });

    expect(svg).toContain('viewBox="0 0 400 300"');
    expect(svg).toContain('d="M 40 60 L 200 180"');
    expect(svg).toContain('stroke-dasharray="0.6 6.6"');
    expect(svg).toContain('stroke-width="1.95"');
    expect(svg).toContain('opacity="0.32"');
  });

  it('消しゴムが先に描いたストロークだけに影響するマスクを生成する', () => {
    const svg = drawingToSvg([
      stroke('pen', [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }]),
      stroke('eraser', [{ x: 0.4, y: 0.4 }, { x: 0.6, y: 0.6 }]),
      stroke('pen', [{ x: 0.1, y: 0.9 }, { x: 0.9, y: 0.1 }]),
    ], { width: 400, height: 300 });

    expect(svg).toContain('<mask id="stroke-mask-0"');
    expect(svg).toContain('stroke="#000000" stroke-width="12"');
    expect(svg).toContain('<g mask="url(#stroke-mask-0)">');
    expect(svg.match(/<g mask=/g)).toHaveLength(1);
  });

  it('正規化されたアライメントオフセットがベクタードローイングに適用されることを確認する', () => {
    const svg = drawingToSvg([
      stroke('pen', [{ x: 0.1, y: 0.2 }, { x: 0.5, y: 0.6 }]),
    ], { width: 400, height: 300, offsetX: 0.1, offsetY: -0.05 });

    expect(svg).toContain('transform="translate(40 -15)"');
  });

  it('SVGデータURLが画像ソースとして使用できる形式で生成されることを確認する', () => {
    const url = drawingToSvgDataUrl([
      stroke('pen', [{ x: 0.1, y: 0.2 }, { x: 0.5, y: 0.6 }]),
    ], { width: 400, height: 300 });

    expect(url).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(decodeURIComponent(url.split(',')[1])).toContain('<svg');
  });
});
