import type {
  CreateStrokeOptions,
  DrawingToolDefinition,
  DrawingToolId,
} from '../types';
import { dashedPenTool } from './dashed-pen';
import { eraserTool } from './eraser';
import { guidePenTool } from './guide-pen';
import { penTool } from './pen';

export const DRAWING_TOOLS: readonly DrawingToolDefinition[] = [
  penTool,
  dashedPenTool,
  guidePenTool,
  eraserTool,
];

const TOOL_REGISTRY = new Map<DrawingToolId, DrawingToolDefinition>(
  DRAWING_TOOLS.map((tool) => [tool.id, tool]),
);

export function getDrawingTool(toolId: DrawingToolId) {
  const tool = TOOL_REGISTRY.get(toolId);
  if (!tool) throw new RangeError(`Unknown drawing tool: ${toolId}`);
  return tool;
}

export function createDrawingStroke(toolId: DrawingToolId, options: CreateStrokeOptions) {
  return getDrawingTool(toolId).createStroke(options);
}
