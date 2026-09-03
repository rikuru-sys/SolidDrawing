import { describe, expect, it } from 'vitest';
import { createDrawingStroke, DRAWING_TOOLS, getDrawingTool } from './tool-registry';

const STROKE_OPTIONS = {
  point: { x: 0.25, y: 0.75 },
  width: 3,
  color: '#30322c',
  opacity: 0.8,
  stabilization: 'medium' as const,
};

describe('描画ツールの登録', () => {
  it('描画ツールのIDが一意であることを確認する', () => {
    const ids = DRAWING_TOOLS.map((tool) => tool.id);

    expect(ids).toEqual(['pen', 'dashed', 'guide', 'shadow', 'eraser']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('各登録されたツールを通じてストロークを作成する', () => {
    DRAWING_TOOLS.forEach((tool) => {
      const stroke = createDrawingStroke(tool.id, STROKE_OPTIONS);

      expect(stroke.tool).toBe(tool.id);
      expect(stroke.points).toEqual([STROKE_OPTIONS.point]);
      expect(stroke.width).toBe(STROKE_OPTIONS.width);
      if (tool.id === 'shadow') {
        expect(stroke.color).toBe('#5f615b');
        expect(stroke.opacity).toBe(0.32);
      } else {
        expect(stroke.color).toBe(STROKE_OPTIONS.color);
        expect(stroke.opacity).toBe(STROKE_OPTIONS.opacity);
      }
    });
  });

  it('点線、ガイド、影、消しゴムの動作をそれぞれの定義に従って保持する', () => {
    const dashed = getDrawingTool('dashed');
    const guide = getDrawingTool('guide');
    const shadow = getDrawingTool('shadow');
    const eraser = getDrawingTool('eraser');
    const guideStroke = guide.createStroke(STROKE_OPTIONS);
    const shadowStroke = shadow.createStroke(STROKE_OPTIONS);
    const eraserStroke = eraser.createStroke(STROKE_OPTIONS);

    expect(dashed.continuesDashPattern).toBe(true);
    const [dashLength, dashGap] = dashed.getLineDash(3);
    expect(dashLength).toBeCloseTo(0.6);
    expect(dashGap).toBeCloseTo(6.6);
    expect(guide.evaluationRole).toBe('ignore');
    expect(guide.getLineWidth(guideStroke)).toBeCloseTo(1.95);
    expect(guide.getOpacity(guideStroke)).toBeCloseTo(0.32);
    expect(shadow.evaluationRole).toBe('shadow');
    expect(shadow.getLineWidth(shadowStroke)).toBe(12);
    expect(shadow.getCursorSize(3)).toBe(12);
    expect(eraser.evaluationRole).toBe('erase');
    expect(eraserStroke.stabilization).toBe('off');
    expect(eraser.getLineWidth(eraserStroke)).toBe(12);
    expect(eraser.getCursorSize(3)).toBe(12);
  });
});
