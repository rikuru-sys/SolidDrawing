import type {
  CreateStrokeOptions,
  DrawingToolDefinition,
  DrawingToolId,
} from '../types';
import { dashedPenTool } from './dashed-pen';
import { eraserTool } from './eraser';
import { guidePenTool } from './guide-pen';
import { penTool } from './pen';
import { shadowPenTool } from './shadow-pen';

// 描画ツールの定義を配列として保持する
export const DRAWING_TOOLS: readonly DrawingToolDefinition[] = [
  penTool,
  dashedPenTool,
  guidePenTool,
  shadowPenTool,
  eraserTool,
];

// 描画ツールの定義をIDでマッピングするためのレジストリを作成する
const TOOL_REGISTRY = new Map<DrawingToolId, DrawingToolDefinition>(
  DRAWING_TOOLS.map((tool) => [tool.id, tool]),
);

/**
  * 指定された描画ツールのIDに対応する描画ツールの定義を取得する
  * @param toolId - 描画ツールのID
  * @returns 描画ツールの定義
  * @throws RangeError - 指定された描画ツールのIDが登録されていない場合にスローされます。
  */
export function getDrawingTool(toolId: DrawingToolId) {
  const tool = TOOL_REGISTRY.get(toolId);
  if (!tool) throw new RangeError(`Unknown drawing tool: ${toolId}`);
  return tool;
}

/**
 * 指定された描画ツールのIDを使用してストロークを作成する
 * @param toolId - 使用する描画ツールのID
 * @param options - ストローク作成のためのオプション
 * @returns 作成されたストロークオブジェクト
 */
export function createDrawingStroke(toolId: DrawingToolId, options: CreateStrokeOptions) {
  return getDrawingTool(toolId).createStroke(options);
}
