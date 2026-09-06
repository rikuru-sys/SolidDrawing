import { getDrawingTool } from '../drawing/tools/tool-registry';
import type { EvaluationRole, Stroke } from '../drawing/types';

const MINIMUM_PATH_LENGTH = 0.02;
const MINIMUM_EXTENT = 0.012;
const RELATIVE_THRESHOLD = 0.04;

type StrokeMetrics = {
  pathLength: number;
  extent: number;
};

function strokeMetrics(stroke: Stroke): StrokeMetrics {
  if (!stroke.points.length) return { pathLength: 0, extent: 0 };
  let pathLength = 0;
  let minX = stroke.points[0].x;
  let maxX = minX;
  let minY = stroke.points[0].y;
  let maxY = minY;

  stroke.points.forEach((point, index) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
    if (!index) return;
    const previous = stroke.points[index - 1];
    pathLength += Math.hypot(point.x - previous.x, point.y - previous.y);
  });

  return {
    pathLength,
    extent: Math.hypot(maxX - minX, maxY - minY),
  };
}

function evaluatedRole(stroke: Stroke): EvaluationRole {
  return getDrawingTool(stroke.tool).evaluationRole;
}

/**
 * 評価と中心合わせから、極端に小さい孤立ストロークを除外する。
 * 消しゴムと評価対象外の補助線は、元の描画状態を保つため変更しない。
 */
export function excludeDrawingNoise(strokes: Stroke[]) {
  const metrics = strokes.map(strokeMetrics);
  const maximumByRole = new Map<EvaluationRole, StrokeMetrics>();

  strokes.forEach((stroke, index) => {
    const role = evaluatedRole(stroke);
    if (role !== 'draw' && role !== 'shadow') return;
    const current = maximumByRole.get(role) ?? { pathLength: 0, extent: 0 };
    maximumByRole.set(role, {
      pathLength: Math.max(current.pathLength, metrics[index].pathLength),
      extent: Math.max(current.extent, metrics[index].extent),
    });
  });

  return strokes.filter((stroke, index) => {
    const role = evaluatedRole(stroke);
    if (role !== 'draw' && role !== 'shadow') return true;
    const maximum = maximumByRole.get(role);
    if (!maximum) return false;
    const minimumLength = Math.max(MINIMUM_PATH_LENGTH, maximum.pathLength * RELATIVE_THRESHOLD);
    const minimumExtent = Math.max(MINIMUM_EXTENT, maximum.extent * RELATIVE_THRESHOLD);
    return metrics[index].pathLength >= minimumLength
      && metrics[index].extent >= minimumExtent;
  });
}
