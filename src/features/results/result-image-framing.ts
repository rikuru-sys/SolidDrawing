export type ImageBounds = { x: number; y: number; width: number; height: number };

/** Bounds of visible marks against white, including faint strokes and shadows. */
export function visibleImageBounds({ data, width, height }: Pick<ImageData, 'data' | 'width' | 'height'>): ImageBounds | null {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const contrast = (255 - Math.min(data[offset], data[offset + 1], data[offset + 2])) * data[offset + 3] / 255;
      if (contrast < 3) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return right < left ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/** One shared crop keeps the sample/drawing scale and alignment unchanged. */
export function sharedImageBounds(bounds: (ImageBounds | null)[], width: number, height: number): ImageBounds {
  const visible = bounds.filter((bound): bound is ImageBounds => bound !== null);
  if (!visible.length) return { x: 0, y: 0, width, height };
  const left = Math.min(...visible.map(bound => bound.x));
  const top = Math.min(...visible.map(bound => bound.y));
  const right = Math.max(...visible.map(bound => bound.x + bound.width));
  const bottom = Math.max(...visible.map(bound => bound.y + bound.height));
  const padding = Math.max(4, Math.max(right - left, bottom - top) * 0.08);
  const x = Math.max(0, left - padding);
  const y = Math.max(0, top - padding);
  return { x, y, width: Math.min(width, right + padding) - x, height: Math.min(height, bottom + padding) - y };
}
