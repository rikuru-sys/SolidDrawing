import type { Stroke } from './types';
import { getDrawingTool } from './tools/tool-registry';

export type DrawingSvgOptions = {
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  background?: string;
};

function formatNumber(value: number) {
  return String(Math.round(value * 100) / 100);
}

function escapeAttribute(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function strokeShape(stroke: Stroke, width: number, height: number, erase = false) {
  const tool = getDrawingTool(stroke.tool);
  const lineWidth = tool.getLineWidth(stroke);
  const color = erase ? '#000000' : escapeAttribute(stroke.color);
  const opacity = erase ? 1 : tool.getOpacity(stroke);
  const dash = erase ? [] : tool.getLineDash(lineWidth);
  const commonAttributes = [
    `fill="none"`,
    `stroke="${color}"`,
    `stroke-width="${formatNumber(lineWidth)}"`,
    `stroke-linecap="round"`,
    `stroke-linejoin="round"`,
    `opacity="${formatNumber(opacity)}"`,
    ...(dash.length ? [`stroke-dasharray="${dash.map(formatNumber).join(' ')}"`] : []),
  ].join(' ');

  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    return `<circle cx="${formatNumber(point.x * width)}" cy="${formatNumber(point.y * height)}" r="${formatNumber(lineWidth / 2)}" fill="${color}" opacity="${formatNumber(opacity)}" />`;
  }

  const path = stroke.points.map((point, index) => (
    `${index ? 'L' : 'M'} ${formatNumber(point.x * width)} ${formatNumber(point.y * height)}`
  )).join(' ');
  return `<path d="${path}" ${commonAttributes} />`;
}

function drawingElements(strokes: Stroke[], width: number, height: number) {
  const definitions: string[] = [];
  const elements: string[] = [];

  strokes.forEach((stroke, index) => {
    const tool = getDrawingTool(stroke.tool);
    if (tool.evaluationRole === 'erase' || !stroke.points.length) return;
    const futureErasers = strokes.slice(index + 1).filter((candidate) => (
      getDrawingTool(candidate.tool).evaluationRole === 'erase' && candidate.points.length
    ));
    const element = strokeShape(stroke, width, height);
    if (!futureErasers.length) {
      elements.push(element);
      return;
    }

    const maskId = `stroke-mask-${index}`;
    definitions.push([
      `<mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${formatNumber(width)}" height="${formatNumber(height)}">`,
      `<rect width="${formatNumber(width)}" height="${formatNumber(height)}" fill="#ffffff" />`,
      ...futureErasers.map((eraser) => strokeShape(eraser, width, height, true)),
      '</mask>',
    ].join(''));
    elements.push(`<g mask="url(#${maskId})">${element}</g>`);
  });

  return {
    definitions: definitions.length ? `<defs>${definitions.join('')}</defs>` : '',
    elements: elements.join(''),
  };
}

export function drawingToSvg(strokes: Stroke[], options: DrawingSvgOptions) {
  const width = Math.max(1, options.width);
  const height = Math.max(1, options.height);
  const translateX = (options.offsetX ?? 0) * width;
  const translateY = (options.offsetY ?? 0) * height;
  const background = escapeAttribute(options.background ?? '#ffffff');
  const { definitions, elements } = drawingElements(strokes, width, height);
  const transform = translateX || translateY
    ? ` transform="translate(${formatNumber(translateX)} ${formatNumber(translateY)})"`
    : '';

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(width)}" height="${formatNumber(height)}" viewBox="0 0 ${formatNumber(width)} ${formatNumber(height)}">`,
    `<rect width="100%" height="100%" fill="${background}" />`,
    definitions,
    `<g${transform}>${elements}</g>`,
    '</svg>',
  ].join('');
}

export function drawingToSvgDataUrl(strokes: Stroke[], options: DrawingSvgOptions) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(drawingToSvg(strokes, options))}`;
}
