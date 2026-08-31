import {
  downloadDataUrl,
  resultFileName,
} from './result-download';
import {
  composeAllAttemptComparisons,
  composeAttemptComparison,
} from './result-image-composer';
import type { Attempt, ComparisonMode } from './types';

export { formatFileTimestamp, resultFileName } from './result-download';
export {
  allResultsCanvasSize,
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
  if (!output) return;
  downloadDataUrl(output.toDataURL('image/png'), resultFileName('comparison', {
    index: options.index,
    shape: options.attempt.prompt.shape,
    mode: options.mode,
    date,
  }));
}

export async function downloadAllAttemptComparisons(options: {
  attempts: Attempt[];
  mode: ComparisonMode;
  overlayOpacity: number;
  date?: Date;
}) {
  const { date = new Date(), ...composition } = options;
  const output = await composeAllAttemptComparisons(composition);
  if (!output) return;
  downloadDataUrl(output.toDataURL('image/png'), resultFileName('all', {
    mode: options.mode,
    date,
  }));
}
