import type { Stroke } from './types';
import { getDrawingTool } from './tools/tool-registry';

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

export function applyEvaluationStrokeStyle(context: CanvasRenderingContext2D, stroke: Stroke) {
  const tool = getDrawingTool(stroke.tool);
  if (tool.evaluationRole === 'ignore') return false;

  context.globalCompositeOperation = tool.evaluationRole === 'erase' ? 'destination-out' : 'source-over';
  context.globalAlpha = 1;
  context.strokeStyle = '#000000';
  context.fillStyle = '#000000';
  context.lineWidth = tool.evaluationRole === 'erase'
    ? tool.getLineWidth(stroke)
    : Math.max(1.5, stroke.width * 0.75);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.setLineDash([]);
  return true;
}
