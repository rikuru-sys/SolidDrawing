import type { PointerEventHandler, RefObject } from 'react';
import type { DrawingToolId } from '../drawing/types';
import { getDrawingTool } from '../drawing/tools/tool-registry';
import type { Settings } from '../settings/practice-settings';
import { DrawingToolbar } from './drawing-toolbar';
import type { PracticePenStylePatch } from './practice-screen.types';

type Props = {
  settings: Settings;
  paused: boolean;
  tool: DrawingToolId;
  strokeCount: number;
  redoCount: number;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  brushCursorRef: RefObject<HTMLDivElement | null>;
  onToolChange: (tool: DrawingToolId) => void;
  onPenStyleChange: (patch: PracticePenStylePatch) => void;
  onUndo: () => void; onRedo: () => void; onClear: () => void;
  onPointerEnter: PointerEventHandler<HTMLCanvasElement>;
  onPointerDown: PointerEventHandler<HTMLCanvasElement>;
  onPointerMove: PointerEventHandler<HTMLCanvasElement>;
  onPointerEnd: PointerEventHandler<HTMLCanvasElement>;
  onPointerLeave: () => void;
};

export function DrawingPanel({
  settings,
  paused,
  tool,
  strokeCount,
  redoCount,
  canvasRef,
  brushCursorRef,
  onToolChange,
  onPenStyleChange,
  onUndo,
  onRedo,
  onClear,
  onPointerEnter,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  onPointerLeave,
}: Props) {
  const activeTool = getDrawingTool(tool);
  const cursorSize = activeTool.getCursorSize(settings.penWidth);
  return <section className="work-panel drawing-panel">
    <div className="work-panel-header"><strong>描画スペース</strong><small>ペン・タッチ・マウス対応</small></div>
    <div className="canvas-stage">
      <canvas ref={canvasRef} className="drawing-canvas" aria-label="描画キャンバス" onPointerEnter={onPointerEnter} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onPointerLeave={onPointerLeave} />
      <div ref={brushCursorRef} className={`brush-cursor ${tool}`} style={{ width: cursorSize, height: cursorSize, borderColor: activeTool.cursorUsesPenColor ? settings.penColor : undefined }} aria-hidden="true" />
      {paused && <div className="drawing-pause-shield" aria-hidden="true" />}
    </div>
    <DrawingToolbar settings={settings} tool={tool} strokeCount={strokeCount} redoCount={redoCount} onToolChange={onToolChange} onPenStyleChange={onPenStyleChange} onUndo={onUndo} onRedo={onRedo} onClear={onClear} />
  </section>;
}
