import type { PointerEventHandler, RefObject } from 'react';
import type { ShapePrompt } from '../../domain/prompt/types';
import type { DrawingToolId } from '../drawing/types';
import type { Settings } from '../settings/practice-settings';

export type PracticePenStylePatch = Partial<Pick<
  Settings,
  'penWidth' | 'penColor' | 'penOpacity' | 'stabilization'
>>;

export type PracticeScreenCurrent = {
  prompt: ShapePrompt;
  questionIndex: number;
  questionCount: number;
  settings: Settings;
};

export type PracticeScreenTimer = {
  remainingSeconds: number;
  elapsedSeconds: number;
  paused: boolean;
};

export type PracticeDrawingBindings = {
  tool: DrawingToolId;
  strokeCount: number;
  redoCount: number;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  brushCursorRef: RefObject<HTMLDivElement | null>;
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

export type PracticeScreenActions = {
  onTogglePaused: () => void;
  onStop: () => void;
  onNext: () => void;
};

export type PracticeScreenProps = {
  current: PracticeScreenCurrent;
  timer: PracticeScreenTimer;
  drawing: PracticeDrawingBindings;
  actions: PracticeScreenActions;
  sampleCanvasRef: RefObject<HTMLCanvasElement | null>;
};
