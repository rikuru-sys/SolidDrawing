import type { Settings } from '../practice-settings';
import { LIGHT_DIRECTION_OPTIONS } from '../settings-options';
import type { ChangeSettings } from './types';

type Props = { settings: Settings; changeSettings: ChangeSettings; onToggleLightDirection: (direction: Settings['lightDirections'][number]) => void };

export function SampleSettingsSection({ settings, changeSettings, onToggleLightDirection }: Props) {
  return <section className="settings-card">
    <h3>見本の表示</h3>
    <div className="sample-style-options">
      <button className={settings.sampleStyle === 'shaded' ? 'choice-button selected' : 'choice-button'} type="button" aria-pressed={settings.sampleStyle === 'shaded'} onClick={() => changeSettings({ sampleStyle: 'shaded' })}>輪郭線と薄い陰影</button>
      <button className={settings.sampleStyle === 'hidden-lines' ? 'choice-button selected' : 'choice-button'} type="button" aria-pressed={settings.sampleStyle === 'hidden-lines'} onClick={() => changeSettings({ sampleStyle: 'hidden-lines' })}>輪郭線（見えない部分は点線）</button>
      <button className={settings.sampleStyle === 'shadow' ? 'choice-button selected' : 'choice-button'} type="button" aria-pressed={settings.sampleStyle === 'shadow'} onClick={() => changeSettings({ sampleStyle: 'shadow' })}>輪郭線と影</button>
    </div>
    <div className="sample-visibility-setting"><h4>練習中の表示時間</h4><div className="difficulty-options">
      <button className={settings.sampleVisibility === 'always' ? 'choice-button selected' : 'choice-button'} type="button" aria-pressed={settings.sampleVisibility === 'always'} onClick={() => changeSettings({ sampleVisibility: 'always' })}><strong>常に表示</strong><small>練習が終わるまで見本を表示します</small></button>
      <button className={settings.sampleVisibility === 'partway' ? 'choice-button selected' : 'choice-button'} type="button" aria-pressed={settings.sampleVisibility === 'partway'} onClick={() => changeSettings({ sampleVisibility: 'partway' })}><strong>途中で隠す</strong><small>時間の半分、指定なしは15秒後に隠します</small></button>
    </div></div>
    {settings.sampleStyle === 'shadow' && <fieldset className="light-direction-fieldset">
      <legend>使用する光源方向</legend>
      <div className="light-direction-options">{LIGHT_DIRECTION_OPTIONS.map((direction) => <label className="check-option" key={direction.value}>
        <input type="checkbox" checked={settings.lightDirections.includes(direction.value)} onChange={() => onToggleLightDirection(direction.value)} />
        <span>{direction.label} <b aria-hidden="true">{direction.arrow}</b></span>
      </label>)}</div>
      <p className="setting-note">選んだ方向の中から、問題ごとに光源をランダム設定します。</p>
    </fieldset>}
  </section>;
}
