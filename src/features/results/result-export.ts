import {
  downloadDataUrl,
  resultFileName,
} from './result-download';
import {
  composeAllAttemptResults,
  composeAttemptComparison,
} from './result-image-composer';
import type { Attempt, ComparisonMode } from './types';

export { formatFileTimestamp, resultFileName } from './result-download';
export {
  allResultsCanvasSize,
  calculateResultAverages,
  containedImageRect,
  type ContainedImageRect,
} from './result-image-composer';

export function downloadAttemptDrawing(attempt: Attempt, index: number, date = new Date()) {
  downloadDataUrl(attempt.drawingImage, resultFileName('drawing', {
    index,
    shape: attempt.prompt.shape,
    date,
  }));
}

export function downloadAttemptSample(attempt: Attempt, index: number, date = new Date()) {
  downloadDataUrl(attempt.sampleImage, resultFileName('sample', {
    index,
    shape: attempt.prompt.shape,
    date,
  }));
}

export async function downloadAttemptComparison(options: {
  attempt: Attempt;
  index: number;
  mode: ComparisonMode;
  overlayOpacity: number;
  date?: Date;
}) {
  const { date = new Date(), ...composition } = options;
  const output = await composeAttemptComparison(composition);
  if (!output) throw new Error('比較画像を作成できませんでした。');
  downloadDataUrl(output.toDataURL('image/png'), resultFileName('comparison', {
    index: options.index,
    shape: options.attempt.prompt.shape,
    mode: options.mode,
    date,
  }));
}

export async function downloadAllAttemptResults(options: {
  attempts: Attempt[];
  mode?: ComparisonMode;
  overlayOpacity?: number;
  date?: Date;
}) {
  const {
    attempts,
    mode = 'side-by-side',
    overlayOpacity = 0.72,
    date = new Date(),
  } = options;
  const output = await composeAllAttemptResults(attempts, mode, overlayOpacity);
  if (!output) throw new Error('全結果画像を作成できませんでした。');
  downloadDataUrl(output.toDataURL('image/png'), resultFileName('all', {
    mode,
    date,
  }));
}
