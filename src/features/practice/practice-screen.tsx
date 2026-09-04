'use client';

import { usesDrawingCanvas } from '../settings/practice-mode';
import { DrawingPanel } from './drawing-panel';
import { PracticeFooter } from './practice-footer';
import { PracticeHeader } from './practice-header';
import type { PracticeScreenProps } from './practice-screen.types';
import { SamplePanel } from './sample-panel';

export type {
  PracticePenStylePatch,
  PracticeScreenProps,
} from './practice-screen.types';

export function PracticeScreen({
  current,
  timer,
  drawing,
  actions,
  sampleCanvasRef,
}: PracticeScreenProps) {
  const hasDrawingCanvas = usesDrawingCanvas(current.settings.practiceMode);

  return <section className="practice-section">
    <PracticeHeader
      prompt={current.prompt}
      questionIndex={current.questionIndex}
      questionCount={current.questionCount}
      time={current.settings.time}
      remainingSeconds={timer.remainingSeconds}
      elapsedSeconds={timer.elapsedSeconds}
      paused={timer.paused}
      onTogglePaused={actions.onTogglePaused}
      onStop={actions.onStop}
    />
    <div className={hasDrawingCanvas ? `workspace-layout layout-${current.settings.layout}` : 'workspace-layout sample-only-layout'}>
      <SamplePanel
        prompt={current.prompt}
        settings={current.settings}
        remainingSeconds={timer.remainingSeconds}
        elapsedSeconds={timer.elapsedSeconds}
        paused={timer.paused}
        canvasRef={sampleCanvasRef}
      />
      {hasDrawingCanvas && <DrawingPanel
        settings={current.settings}
        paused={timer.paused}
        tool={drawing.tool}
        strokeCount={drawing.strokeCount}
        redoCount={drawing.redoCount}
        canvasRef={drawing.canvasRef}
        brushCursorRef={drawing.brushCursorRef}
        onToolChange={drawing.onToolChange}
        onPenStyleChange={drawing.onPenStyleChange}
        onUndo={drawing.onUndo}
        onRedo={drawing.onRedo}
        onClear={drawing.onClear}
        onPointerEnter={drawing.onPointerEnter}
        onPointerDown={drawing.onPointerDown}
        onPointerMove={drawing.onPointerMove}
        onPointerEnd={drawing.onPointerEnd}
        onPointerLeave={drawing.onPointerLeave}
      />}
    </div>
    <PracticeFooter settings={current.settings} onNext={actions.onNext} />
  </section>;
}
