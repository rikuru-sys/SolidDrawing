import { usesDrawingCanvas } from '../practice-mode';
import type { Settings } from '../practice-settings';
import { LAYOUT_OPTIONS } from '../settings-options';
import type { ChangeSettings } from './types';

type Props = { settings: Settings; changeSettings: ChangeSettings };

export function LayoutSettingsSection({ settings, changeSettings }: Props) {
  if (!usesDrawingCanvas(settings.practiceMode)) return null;
  return <section className="settings-card wide-card">
    <h3>見本と描画スペースの配置</h3>
    <div className="layout-options">{LAYOUT_OPTIONS.map((layout) => <button key={layout.value} className={settings.layout === layout.value ? 'layout-choice selected' : 'layout-choice'} type="button" aria-pressed={settings.layout === layout.value} onClick={() => changeSettings({ layout: layout.value })}>
      <span className={`layout-mini ${layout.value}`} aria-hidden="true"><i /><i /></span><span>{layout.label}</span>
    </button>)}</div>
  </section>;
}
