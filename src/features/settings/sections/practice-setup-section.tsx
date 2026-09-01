import { PRACTICE_MODE_OPTIONS } from '../practice-mode';
import type { Settings } from '../practice-settings';
import type { ChangeSettings } from './types';

type Props = { settings: Settings; changeSettings: ChangeSettings };

export function PracticeSetupSection({ settings, changeSettings }: Props) {
  return <>
    <section className="settings-card wide-card">
      <h3>難易度</h3>
      <div className="difficulty-options">
        <button className={settings.difficulty === 'easy' ? 'choice-button selected' : 'choice-button'} type="button" aria-pressed={settings.difficulty === 'easy'} onClick={() => changeSettings({ difficulty: 'easy' })}>
          <strong>簡単</strong><small>現在と同じく、立体を直立させたまま見る方向を変えます</small>
        </button>
        <button className={settings.difficulty === 'hard' ? 'choice-button selected' : 'choice-button'} type="button" aria-pressed={settings.difficulty === 'hard'} onClick={() => changeSettings({ difficulty: 'hard' })}>
          <strong>難しい</strong><small>立体そのものを上下・左右・傾き方向へランダムに回転します</small>
        </button>
      </div>
    </section>
    <section className="settings-card wide-card">
      <h3>練習方法</h3>
      <div className="difficulty-options">
        {PRACTICE_MODE_OPTIONS.map((option) => <button key={option.value} className={settings.practiceMode === option.value ? 'choice-button selected' : 'choice-button'} type="button" aria-pressed={settings.practiceMode === option.value} onClick={() => changeSettings({ practiceMode: option.value })}>
          <strong>{option.label}</strong><small>{option.description}</small>
        </button>)}
      </div>
    </section>
  </>;
}
