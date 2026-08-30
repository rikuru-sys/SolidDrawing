import type { ShapePrompt } from '../../domain/prompt/types';
import type { ShapeEvaluation } from '../evaluation/types';
import type { PracticeMode } from '../settings/practice-settings';

export type ComparisonMode = 'side-by-side' | 'overlay';

export type Attempt = {
  prompt: ShapePrompt;
  sampleImage: string;
  drawingImage: string;
  alignedDrawingImage: string;
  drawingSvg: string;
  alignedDrawingSvg: string;
  seconds: number;
  evaluation: ShapeEvaluation;
  practiceMode: PracticeMode;
};
