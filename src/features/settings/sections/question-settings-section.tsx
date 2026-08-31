import { ALL_SHAPES, TIME_CHOICES, type Settings } from '../practice-settings';
import type { ChangeSettings } from './types';

type Props = { settings: Settings; changeSettings: ChangeSettings; onToggleShape: (shape: Settings['shapes'][number]) => void };

export function QuestionSettingsSection({ settings, changeSettings, onToggleShape }: Props) {
  return <>
    <section className="settings-card">
      <h3>出題する立体</h3>
      <div className="shape-options">{ALL_SHAPES.map((shape) => <label key={shape} className="check-option">
        <input type="checkbox" checked={settings.shapes.includes(shape)} onChange={() => onToggleShape(shape)} />{shape}
      </label>)}</div>
    </section>
    <section className="settings-card">
      <h3>1回の制限時間</h3>
      <div className="time-options">{TIME_CHOICES.map((time) => <button key={time ?? 'none'} className={settings.time === time ? 'choice-button selected' : 'choice-button'} type="button" aria-pressed={settings.time === time} onClick={() => changeSettings({ time })}>
        {time === null ? '指定なし' : `${time}秒`}
      </button>)}</div>
    </section>
  </>;
}
