import type { Stabilization } from '../drawing/types';
import type { Settings } from '../settings/practice-settings';
import type { PracticePenStylePatch } from './practice-screen.types';

type Props = { settings: Settings; onChange: (patch: PracticePenStylePatch) => void };

export function DrawingStyleControls({ settings, onChange }: Props) {
  return <div className="drawing-style-controls" role="group" aria-label="ペンの設定">
    <label className="toolbar-width-control"><span>太さ</span><select value={settings.penWidth} onChange={(event) => onChange({ penWidth: Number(event.target.value) })} aria-label="練習中のペンの太さ"><option value="2">細い</option><option value="3">普通</option><option value="5">太い</option></select></label>
    <label className="toolbar-stabilization-control"><span>手振れ</span><select value={settings.stabilization} onChange={(event) => onChange({ stabilization: event.target.value as Stabilization })} aria-label="練習中の手振れ補正"><option value="off">なし</option><option value="low">弱</option><option value="medium">中</option></select></label>
    <label className="toolbar-color-control"><span>色</span><input type="color" value={settings.penColor} onChange={(event) => onChange({ penColor: event.target.value })} aria-label="練習中のペン色" /></label>
    <label className="toolbar-opacity-control"><span>濃さ {Math.round(settings.penOpacity * 100)}%</span><input type="range" min="0.1" max="1" step="0.1" value={settings.penOpacity} onChange={(event) => onChange({ penOpacity: Number(event.target.value) })} aria-label="練習中のペンの不透明度" /></label>
  </div>;
}
