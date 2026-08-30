import type {
  CreateStrokeOptions,
  DrawingToolId,
  Stabilization,
  Stroke,
} from '../types';

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
