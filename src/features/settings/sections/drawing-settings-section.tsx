import type { Stabilization } from '../../drawing/types';
import type { Settings } from '../practice-settings';
import type { ChangeSettings } from './types';

type Props = { settings: Settings; changeSettings: ChangeSettings };

export function DrawingSettingsSection({ settings, changeSettings }: Props) {
  return <section className="settings-card">
    <h3>回数と描画ツール</h3>
    <div className="field-grid">
      <label className="field-label">練習回数<input type="number" min="1" max="20" value={settings.count} onChange={(event) => changeSettings({ count: Number(event.target.value) })} /><small>1〜20回</small></label>
      <label className="field-label">線の太さ<select value={settings.penWidth} onChange={(event) => changeSettings({ penWidth: Number(event.target.value) })}><option value="2">細い</option><option value="3">普通</option><option value="5">太い</option></select></label>
      <label className="field-label">手振れ補正<select value={settings.stabilization} onChange={(event) => changeSettings({ stabilization: event.target.value as Stabilization })}><option value="off">なし</option><option value="low">弱</option><option value="medium">中</option></select></label>
      <label className="field-label">ペン色<span className="color-setting"><input type="color" value={settings.penColor} onChange={(event) => changeSettings({ penColor: event.target.value })} aria-label="ペン色" /><span>{settings.penColor.toUpperCase()}</span></span></label>
      <label className="field-label">ペンの不透明度<span className="opacity-setting"><input type="range" min="0.1" max="1" step="0.1" value={settings.penOpacity} onChange={(event) => changeSettings({ penOpacity: Number(event.target.value) })} aria-label="ペンの不透明度" /><output>{Math.round(settings.penOpacity * 100)}%</output></span></label>
    </div>
    <p className="setting-note">手振れ補正はペン・点線・補助線に適用し、消しゴムは遅延なしで動きます。</p>
  </section>;
}
