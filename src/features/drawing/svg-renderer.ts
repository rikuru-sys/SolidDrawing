import type { Stroke } from './types';
import { getDrawingTool } from './tools/tool-registry';

export type DrawingSvgOptions = {
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  background?: string;
};

/**
 * 数値を小数点以下2桁に丸めて文字列に変換する
 * @param value - 変換する数値
 * @returns 小数点以下2桁に丸められた文字列
 */
function formatNumber(value: number) {
  return String(Math.round(value * 100) / 100);
}

/**
 * SVG属性値で特別な意味を持つ文字をエスケープする
 * @param value - エスケープする文字列
 * @returns SVG属性値として利用できる文字列
 * @remarks
 * &, ", <, >を、それぞれ&amp;, &quot;, &lt;, &gt;へ置き換えます。
 */
function escapeAttribute(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/**
 * ストロークをSVGの形状要素に変換する
 * @param stroke - 変換するストロークオブジェクト
 * @param width - 描画領域の幅
 * @param height - 描画領域の高さ
 * @param erase - 消しゴムモードかどうかのフラグ。デフォルトはfalse。
 * @returns SVGの形状要素を表す文字列
 * @remarks
 * この関数は、ストロークのポイントを基にSVGの<path>または<circle>要素を生成します。
 * 消しゴムモードの場合、ストロークは黒色で描画され、マスクとして使用されます。
 */
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

  // ストロークが1点のみの場合は、円形のSVG要素を生成する
  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    return `<circle cx="${formatNumber(point.x * width)}" cy="${formatNumber(point.y * height)}" r="${formatNumber(lineWidth / 2)}" fill="${color}" opacity="${formatNumber(opacity)}" />`;
  }

  // ストロークが複数の点を持つ場合は、パス要素を生成する
  const path = stroke.points.map((point, index) => (
    `${index ? 'L' : 'M'} ${formatNumber(point.x * width)} ${formatNumber(point.y * height)}`
  )).join(' ');
  return `<path d="${path}" ${commonAttributes} />`;
}

/**
 * ストロークの配列をSVGの定義と要素に変換する
 * @param strokes - 変換するストロークの配列
 * @param width - 描画領域の幅
 * @param height - 描画領域の高さ
 * @returns SVGの定義と要素を含むオブジェクト
 * @remarks
 * この関数は、各ストロークをSVGの形状要素に変換し、必要に応じてマスクを生成します。
 * 後から描かれた消しゴムストロークをマスクとして使い、それ以前のストロークだけを消去します。
 */
function drawingElements(strokes: Stroke[], width: number, height: number) {
  const definitions: string[] = [];
  const elements: string[] = [];

  strokes.forEach((stroke, index) => {
    const tool = getDrawingTool(stroke.tool);

    // 消しゴムモードのストロークの場合、またはポイントがない場合は描画をスキップする
    if (tool.evaluationRole === 'erase' || !stroke.points.length) return;

    // 後続の消しゴムモードのストロークを検索する
    const futureErasers = strokes.slice(index + 1).filter((candidate) => (
      getDrawingTool(candidate.tool).evaluationRole === 'erase' && candidate.points.length
    ));
    const element = strokeShape(stroke, width, height);

    // 後続の消しゴムモードのストロークがない場合は、通常の描画要素として追加する
    if (!futureErasers.length) {
      elements.push(element);
      return;
    }

    // 後続の消しゴムモードのストロークがある場合は、マスクを生成して描画要素を追加する
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

/**
 * ストロークの配列をSVG形式の文字列に変換する
 * @param strokes - 変換するストロークの配列
 * @param options - SVG生成のためのオプション
 * @returns SVG形式の文字列
 * @remarks
 * この関数は、ストロークの配列をSVG形式に変換し、必要に応じて背景色やアライメントオフセットを適用します。
 * また、消しゴムストロークはマスクとして処理され、それ以前に描かれたストロークだけに影響します。
 */
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
