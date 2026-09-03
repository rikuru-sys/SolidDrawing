import type { ShapeEvaluation } from '../evaluation/types';
import type { Attempt, ComparisonMode } from './types';

export type ContainedImageRect = { x: number; y: number; width: number; height: number };

export function containedImageRect(sourceWidth: number, sourceHeight: number, x: number, y: number, width: number, height: number): ContainedImageRect {
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  return { x: x + (width - drawWidth) / 2, y: y + (height - drawHeight) / 2, width: drawWidth, height: drawHeight };
}

export function allResultsCanvasSize(attemptCount: number) {
  const columnCount = 2;
  const width = 1600;
  const rowGap = 20;
  const headerHeight = 120;
  const cardHeight = 430;
  const rowCount = Math.ceil(Math.max(0, attemptCount) / columnCount);
  return { width, height: headerHeight + rowCount * cardHeight + Math.max(0, rowCount - 1) * rowGap + 30, columnCount, rowCount };
}

function formatEvaluationDetails(evaluation: ShapeEvaluation) {
  const shapeDetails = `輪郭 ${evaluation.outline}点　傾き ${evaluation.angle}点　大きさ ${evaluation.size}点　比率 ${evaluation.proportion}点`;
  return evaluation.shadow === null
    ? shapeDetails
    : `${shapeDetails}　影 ${evaluation.shadow}点`;
}

function drawImageContained(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const rect = containedImageRect(image.naturalWidth || image.width, image.naturalHeight || image.height, x, y, width, height);
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Result image could not be loaded.'));
    image.src = source;
  });
}

export async function composeAttemptComparison(options: { attempt: Attempt; index: number; mode: ComparisonMode; overlayOpacity: number }) {
  const { attempt, index, mode, overlayOpacity } = options;
  const output = document.createElement('canvas');
  output.width = 1240;
  output.height = 740;
  const context = output.getContext('2d');
  if (!context) return null;
  context.fillStyle = '#f1efe8';
  context.fillRect(0, 0, output.width, output.height);
  context.fillStyle = '#25261f';
  context.font = 'bold 32px sans-serif';
  context.fillText(`${index + 1}. ${attempt.prompt.shape}`, 50, 56);
  context.font = '20px sans-serif';
  const [sample, drawing] = await Promise.all([loadImage(attempt.sampleImage), loadImage(mode === 'overlay' ? attempt.alignedDrawingSvg : attempt.drawingSvg)]);
  if (mode === 'overlay') {
    context.fillText('見本と描画の重ね合わせ', 50, 108);
    context.fillStyle = '#ffffff';
    context.fillRect(180, 130, 880, 500);
    drawImageContained(context, sample, 180, 130, 880, 500);
    context.save();
    context.globalAlpha = overlayOpacity;
    context.globalCompositeOperation = 'multiply';
    drawImageContained(context, drawing, 180, 130, 880, 500);
    context.restore();
  } else {
    context.fillText('見本', 50, 108);
    context.fillText('描いたもの', 645, 108);
    context.fillStyle = '#ffffff';
    context.fillRect(50, 130, 545, 500);
    context.fillRect(645, 130, 545, 500);
    drawImageContained(context, sample, 50, 130, 545, 500);
    drawImageContained(context, drawing, 645, 130, 545, 500);
  }
  context.fillStyle = '#686b60';
  context.font = '18px sans-serif';
  context.fillText(`描画時間 ${attempt.seconds}秒　総合評価 ${attempt.evaluation.score}点`, 50, 674);
  context.fillText(formatEvaluationDetails(attempt.evaluation), 50, 708);
  return output;
}

export async function composeAllAttemptComparisons(options: { attempts: Attempt[]; mode: ComparisonMode; overlayOpacity: number }) {
  const { attempts, mode, overlayOpacity } = options;
  if (!attempts.length) return null;
  const output = document.createElement('canvas');
  const outerPadding = 40;
  const columnGap = 20;
  const rowGap = 20;
  const headerHeight = 120;
  const cardHeight = 430;
  const { width, height, columnCount } = allResultsCanvasSize(attempts.length);
  const cardWidth = (width - outerPadding * 2 - columnGap) / columnCount;
  output.width = width;
  output.height = height;
  const context = output.getContext('2d');
  if (!context) return null;
  context.fillStyle = '#f1efe8';
  context.fillRect(0, 0, output.width, output.height);
  context.fillStyle = '#25261f';
  context.font = 'bold 34px sans-serif';
  context.fillText('立体ドローイング　練習結果', outerPadding, 55);
  context.fillStyle = '#686b60';
  context.font = '18px sans-serif';
  context.fillText(`${attempts.length}回分・${mode === 'overlay' ? '中心合わせ重ね合わせ' : '見本と描画の横並び'}・2列表示`, outerPadding, 91);

  for (const [index, attempt] of attempts.entries()) {
    const column = index % columnCount;
    const row = Math.floor(index / columnCount);
    const left = outerPadding + column * (cardWidth + columnGap);
    const top = headerHeight + row * (cardHeight + rowGap);
    const cardPadding = 18;
    const paneGap = 14;
    const paneWidth = (cardWidth - cardPadding * 2 - paneGap) / 2;
    const imageTop = top + 104;
    const imageHeight = 292;
    const [sample, drawing] = await Promise.all([loadImage(attempt.sampleImage), loadImage(mode === 'overlay' ? attempt.alignedDrawingSvg : attempt.drawingSvg)]);
    context.fillStyle = '#fffef9';
    context.fillRect(left, top, cardWidth, cardHeight);
    context.strokeStyle = '#d9d6cc';
    context.lineWidth = 2;
    context.strokeRect(left, top, cardWidth, cardHeight);
    context.fillStyle = '#25261f';
    context.font = 'bold 22px sans-serif';
    context.fillText(`${index + 1}. ${attempt.prompt.shape}`, left + cardPadding, top + 32);
    context.fillStyle = '#686b60';
    context.font = '16px sans-serif';
    context.textAlign = 'right';
    context.fillText(`描画時間 ${attempt.seconds}秒・評価 ${attempt.evaluation.score}点`, left + cardWidth - cardPadding, top + 32);
    context.textAlign = 'left';
    context.font = '15px sans-serif';
    context.fillText(formatEvaluationDetails(attempt.evaluation), left + cardPadding, top + 59);
    context.font = '16px sans-serif';
    if (mode === 'overlay') {
      const imageWidth = cardWidth - cardPadding * 2;
      context.fillText('見本＋描画（中心合わせ）', left + cardPadding, top + 88);
      context.fillStyle = '#ffffff';
      context.fillRect(left + cardPadding, imageTop, imageWidth, imageHeight);
      drawImageContained(context, sample, left + cardPadding, imageTop, imageWidth, imageHeight);
      context.save();
      context.globalAlpha = overlayOpacity;
      context.globalCompositeOperation = 'multiply';
      drawImageContained(context, drawing, left + cardPadding, imageTop, imageWidth, imageHeight);
      context.restore();
    } else {
      context.fillText('見本', left + cardPadding, top + 88);
      context.fillText('描いたもの', left + cardPadding + paneWidth + paneGap, top + 88);
      context.fillStyle = '#ffffff';
      context.fillRect(left + cardPadding, imageTop, paneWidth, imageHeight);
      context.fillRect(left + cardPadding + paneWidth + paneGap, imageTop, paneWidth, imageHeight);
      drawImageContained(context, sample, left + cardPadding, imageTop, paneWidth, imageHeight);
      drawImageContained(context, drawing, left + cardPadding + paneWidth + paneGap, imageTop, paneWidth, imageHeight);
    }
  }
  return output;
}
