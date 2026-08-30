import type { Point, Stabilization } from './types';

export function stabilizeStrokePoint(
  previous: Point,
  next: Point,
  stabilization: Stabilization,
  width: number,
  height: number,
  finishing = false,
) {
  if (stabilization === 'off') return next;
  const distance = Math.hypot(
    (next.x - previous.x) * width,
    (next.y - previous.y) * height,
  );
  const baseStrength = stabilization === 'low' ? 0.68 : 0.45;
  const adaptiveStrength = stabilization === 'low'
    ? Math.min(0.24, distance / 80)
    : Math.min(0.4, distance / 60);
  const finishingStrength = stabilization === 'low' ? 0.9 : 0.76;
  const strength = finishing
    ? Math.max(finishingStrength, baseStrength + adaptiveStrength)
    : baseStrength + adaptiveStrength;
  return {
    x: previous.x + (next.x - previous.x) * strength,
    y: previous.y + (next.y - previous.y) * strength,
  };
}
