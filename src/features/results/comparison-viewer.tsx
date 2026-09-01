import type { ReactNode } from 'react';
import { usesDrawingCanvas } from '../settings/practice-mode';
import { CanvasComparison } from './canvas-comparison';
import { SampleOnlyComparison } from './sample-only-comparison';
import type { Attempt, ComparisonMode } from './types';

type Props = {
  attempt: Attempt;
  resultNumber: number;
  mode: ComparisonMode;
  overlayOpacity: number;
  onModeChange: (mode: ComparisonMode) => void;
  onOverlayOpacityChange: (opacity: number) => void;
  children?: ReactNode;
};

export function ComparisonViewer(props: Props) {
  if (!usesDrawingCanvas(props.attempt.practiceMode)) {
    return <SampleOnlyComparison attempt={props.attempt} resultNumber={props.resultNumber} />;
  }

  return <CanvasComparison
    attempt={props.attempt}
    resultNumber={props.resultNumber}
    mode={props.mode}
    overlayOpacity={props.overlayOpacity}
    onModeChange={props.onModeChange}
    onOverlayOpacityChange={props.onOverlayOpacityChange}
  >
    {props.children}
  </CanvasComparison>;
}
