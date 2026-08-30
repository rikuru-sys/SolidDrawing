import type { Point } from '../drawing/types';

export function dilateMask(mask: Uint8Array, size: number, radius: number) {
  const output = new Uint8Array(mask.length);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!mask[y * size + x]) continue;
      const minY = Math.max(0, y - radius);
      const maxY = Math.min(size - 1, y + radius);
      const minX = Math.max(0, x - radius);
      const maxX = Math.min(size - 1, x + radius);
      for (let targetY = minY; targetY <= maxY; targetY += 1) {
        for (let targetX = minX; targetX <= maxX; targetX += 1) {
          output[targetY * size + targetX] = 1;
        }
      }
    }
  }
  return output;
}

export function maskMatch(source: Uint8Array, dilatedTarget: Uint8Array) {
  let total = 0;
  let matched = 0;
  source.forEach((value, index) => {
    if (!value) return;
    total += 1;
    if (dilatedTarget[index]) matched += 1;
  });
  return total ? matched / total : 0;
}

export function maskBounds(mask: Uint8Array, size: number) {
  let minX = size;
  let minY = size;
  let maxX = -1;
  let maxY = -1;
  mask.forEach((value, index) => {
    if (!value) return;
    const x = index % size;
    const y = Math.floor(index / size);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  if (maxX < 0 || maxY < 0) return null;
  return {
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

export function translateMask(mask: Uint8Array, size: number, offsetX: number, offsetY: number) {
  const output = new Uint8Array(mask.length);
  mask.forEach((value, index) => {
    if (!value) return;
    const x = (index % size) + offsetX;
    const y = Math.floor(index / size) + offsetY;
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    output[y * size + x] = 1;
  });
  return output;
}

function localLineDirection(mask: Uint8Array, size: number, centerX: number, centerY: number) {
  const radius = 5;
  const points: Point[] = [];
  for (let y = Math.max(0, centerY - radius); y <= Math.min(size - 1, centerY + radius); y += 1) {
    for (let x = Math.max(0, centerX - radius); x <= Math.min(size - 1, centerX + radius); x += 1) {
      if (mask[y * size + x]) points.push({ x, y });
    }
  }
  if (points.length < 4) return null;
  const meanX = points.reduce((total, point) => total + point.x, 0) / points.length;
  const meanY = points.reduce((total, point) => total + point.y, 0) / points.length;
  let covarianceX = 0;
  let covarianceY = 0;
  let covarianceXY = 0;
  points.forEach((point) => {
    const x = point.x - meanX;
    const y = point.y - meanY;
    covarianceX += x * x;
    covarianceY += y * y;
    covarianceXY += x * y;
  });
  const trace = covarianceX + covarianceY;
  if (!trace) return null;
  const separation = Math.hypot(covarianceX - covarianceY, 2 * covarianceXY);
  const confidence = separation / trace;
  if (confidence < 0.18) return null;
  return {
    angle: 0.5 * Math.atan2(2 * covarianceXY, covarianceX - covarianceY),
    confidence,
  };
}

function nearestMaskPoint(mask: Uint8Array, size: number, x: number, y: number, radius: number) {
  let nearest: Point | null = null;
  let nearestDistance = radius * radius + 1;
  for (let targetY = Math.max(0, y - radius); targetY <= Math.min(size - 1, y + radius); targetY += 1) {
    for (let targetX = Math.max(0, x - radius); targetX <= Math.min(size - 1, x + radius); targetX += 1) {
      if (!mask[targetY * size + targetX]) continue;
      const distance = (targetX - x) ** 2 + (targetY - y) ** 2;
      if (distance >= nearestDistance) continue;
      nearestDistance = distance;
      nearest = { x: targetX, y: targetY };
    }
  }
  return nearest;
}

export function lineAngleMatch(
  sampleMask: Uint8Array,
  drawingMask: Uint8Array,
  size: number,
  tolerance: number,
) {
  let totalWeight = 0;
  let matchedWeight = 0;
  let sampleCount = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      if (!drawingMask[index] || index % 3 !== 0) continue;
      const drawingDirection = localLineDirection(drawingMask, size, x, y);
      if (!drawingDirection) continue;
      totalWeight += drawingDirection.confidence;
      sampleCount += 1;
      const samplePoint = nearestMaskPoint(sampleMask, size, x, y, tolerance);
      if (!samplePoint) continue;
      const sampleDirection = localLineDirection(sampleMask, size, samplePoint.x, samplePoint.y);
      if (!sampleDirection) continue;
      let difference = Math.abs(drawingDirection.angle - sampleDirection.angle) % Math.PI;
      difference = Math.min(difference, Math.PI - difference);
      const similarity = Math.max(0, 1 - difference / (Math.PI / 6));
      const weight = Math.min(drawingDirection.confidence, sampleDirection.confidence);
      matchedWeight += similarity * weight;
    }
  }
  return sampleCount >= 12 && totalWeight ? matchedWeight / totalWeight : null;
}

export function strictMetricScore(ratio: number) {
  const normalizedRatio = Math.max(0, Math.min(1, ratio));
  return Math.round(Math.pow(normalizedRatio, 1.2) * 100);
}
