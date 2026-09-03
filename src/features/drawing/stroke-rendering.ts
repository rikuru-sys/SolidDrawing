import type { Stroke } from './types';
import { getDrawingTool } from './tools/tool-registry';

/** 評価用マスクへ再描画するストロークの種類。 */
export type EvaluationStrokeTarget = 'shape' | 'shadow';

/**
 * ストロークの描画スタイルをCanvasRenderingContext2Dに適用する
 * @param context - 描画コンテキスト
 * @param stroke - 適用するストロークオブジェクト
 * @returns なし
 * @throws RangeError - 指定された描画ツールのIDが登録されていない場合にスローされます。
 */
export function applyStrokeStyle(context: CanvasRenderingContext2D, stroke: Stroke) {
  const tool = getDrawingTool(stroke.tool);
  context.globalCompositeOperation = tool.evaluationRole === 'erase' ? 'destination-out' : 'source-over';
  context.globalAlpha = tool.getOpacity(stroke);
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.lineWidth = tool.getLineWidth(stroke);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.setLineDash(tool.getLineDash(context.lineWidth));
}

/**
 * ストロークの評価用描画スタイルをCanvasRenderingContext2Dに適用する
 * @param context - 描画コンテキスト
 * @param stroke - 適用するストロークオブジェクト
 * @returns 評価用に描画する場合はtrue、評価対象外の場合はfalse
 * @throws RangeError - 指定された描画ツールのIDが登録されていない場合にスローされます。
 */
export function applyEvaluationStrokeStyle(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  target: EvaluationStrokeTarget,
) {
  const tool = getDrawingTool(stroke.tool);
  const isTargetStroke = target === 'shape'
    ? tool.evaluationRole === 'draw'
    : tool.evaluationRole === 'shadow';
  const isEraser = tool.evaluationRole === 'erase';
  if (!isTargetStroke && !isEraser) return false;

  context.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
  context.globalAlpha = 1;
  context.strokeStyle = '#000000';
  context.fillStyle = '#000000';
  context.lineWidth = isEraser
    ? tool.getLineWidth(stroke)
    : Math.max(1.5, tool.getLineWidth(stroke) * 0.75);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.setLineDash([]);
  return true;
}
