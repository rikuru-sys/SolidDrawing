import type { DrawingToolId } from '../drawing/types';
import { DRAWING_TOOLS } from '../drawing/tools/tool-registry';
import type { Settings } from '../settings/practice-settings';
import type { PracticePenStylePatch } from './practice-screen.types';
import { DrawingStyleControls } from './drawing-style-controls';

type Props = {
  settings: Settings;
  tool: DrawingToolId;
  strokeCount: number;
  redoCount: number;
  onToolChange: (tool: DrawingToolId) => void;
  onPenStyleChange: (patch: PracticePenStylePatch) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
};

export function DrawingToolbar({ settings, tool, strokeCount, redoCount, onToolChange, onPenStyleChange, onUndo, onRedo, onClear }: Props) {
  return <div className="drawing-toolbar" aria-label="描画ツール">
    <div className="drawing-tool-group">{DRAWING_TOOLS.map((drawingTool) => <button key={drawingTool.id} className={tool === drawingTool.id ? 'tool-button selected' : 'tool-button'} type="button" aria-pressed={tool === drawingTool.id} onClick={() => onToolChange(drawingTool.id)}>{drawingTool.label}</button>)}</div>
    <DrawingStyleControls settings={settings} onChange={onPenStyleChange} />
    <div className="drawing-tool-group history-tools">
      <button className="tool-button" type="button" disabled={!strokeCount} onClick={onUndo}>元に戻す</button>
      <button className="tool-button" type="button" disabled={!redoCount} onClick={onRedo}>やり直す</button>
      <button className="tool-button" type="button" disabled={!strokeCount} onClick={onClear}>全消去</button>
    </div>
  </div>;
}
