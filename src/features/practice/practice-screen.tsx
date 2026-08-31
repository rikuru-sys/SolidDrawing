'use client';

import type { PointerEventHandler, RefObject } from 'react';
import type { ShapePrompt } from '../../domain/prompt/types';
import type { DrawingToolId } from '../drawing/types';
import type { Settings } from '../settings/practice-settings';
import { DrawingPanel } from './drawing-panel';
import { PracticeFooter } from './practice-footer';
import { PracticeHeader } from './practice-header';
import type { PracticePenStylePatch } from './practice-screen.types';
import { SamplePanel } from './sample-panel';

export type { PracticePenStylePatch } from './practice-screen.types';

export type PracticeScreenProps = {
  prompt: ShapePrompt;
  questionIndex: number;
  questionCount: number;
  settings: Settings;
  remainingSeconds: number;
  elapsedSeconds: number;
  paused: boolean;
  tool: DrawingToolId;
  strokeCount: number;
  redoCount: number;
  sampleCanvasRef: RefObject<HTMLCanvasElement | null>;
  drawingCanvasRef: RefObject<HTMLCanvasElement | null>;
  brushCursorRef: RefObject<HTMLDivElement | null>;
  onTogglePaused: () => void;
  onStop: () => void;
  onNext: () => void;
  onToolChange: (tool: DrawingToolId) => void;
  onPenStyleChange: (patch: PracticePenStylePatch) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onPointerEnter: PointerEventHandler<HTMLCanvasElement>;
  onPointerDown: PointerEventHandler<HTMLCanvasElement>;
  onPointerMove: PointerEventHandler<HTMLCanvasElement>;
  onPointerEnd: PointerEventHandler<HTMLCanvasElement>;
  onPointerLeave: () => void;
};

export function PracticeScreen(props: PracticeScreenProps) {
  return <section className="practice-section">
    <PracticeHeader
      prompt={props.prompt}
      questionIndex={props.questionIndex}
      questionCount={props.questionCount}
      time={props.settings.time}
      remainingSeconds={props.remainingSeconds}
      elapsedSeconds={props.elapsedSeconds}
      paused={props.paused}
      onTogglePaused={props.onTogglePaused}
      onStop={props.onStop}
    />
    <div className={props.settings.practiceMode === 'sample-only' ? 'workspace-layout sample-only-layout' : `workspace-layout layout-${props.settings.layout}`}>
      <SamplePanel prompt={props.prompt} settings={props.settings} remainingSeconds={props.remainingSeconds} elapsedSeconds={props.elapsedSeconds} paused={props.paused} canvasRef={props.sampleCanvasRef} />
      {props.settings.practiceMode === 'canvas' && <DrawingPanel
        settings={props.settings}
        paused={props.paused}
        tool={props.tool}
        strokeCount={props.strokeCount}
        redoCount={props.redoCount}
        canvasRef={props.drawingCanvasRef}
        brushCursorRef={props.brushCursorRef}
        onToolChange={props.onToolChange}
        onPenStyleChange={props.onPenStyleChange}
        onUndo={props.onUndo}
        onRedo={props.onRedo}
        onClear={props.onClear}
        onPointerEnter={props.onPointerEnter}
        onPointerDown={props.onPointerDown}
        onPointerMove={props.onPointerMove}
        onPointerEnd={props.onPointerEnd}
        onPointerLeave={props.onPointerLeave}
      />}
    </div>
    <PracticeFooter settings={props.settings} onNext={props.onNext} />
  </section>;
}
