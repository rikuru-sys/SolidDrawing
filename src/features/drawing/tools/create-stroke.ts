import type {
  CreateStrokeOptions,
  DrawingToolId,
  Stabilization,
  Stroke,
} from '../types';

/**
 * ストロークを作成する
 * @param tool - 使用する描画ツールのID
 * @param options - ストローク作成のためのオプション
 * @param stabilization - ストロークの安定化設定。省略した場合はoptions.stabilizationが使用されます。
 * @returns 作成されたストロークオブジェクト
 */
export function createStroke(
  tool: DrawingToolId,
  options: CreateStrokeOptions,
  stabilization: Stabilization = options.stabilization,
): Stroke {
  return {
    tool,
    points: [options.point],
    width: options.width,
    color: options.color,
    opacity: options.opacity,
    stabilization,
  };
}
