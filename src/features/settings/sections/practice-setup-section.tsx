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
        <button className={settings.practiceMode === 'canvas' ? 'choice-button selected' : 'choice-button'} type="button" aria-pressed={settings.practiceMode === 'canvas'} onClick={() => changeSettings({ practiceMode: 'canvas' })}>
          <strong>サイト内で描く</strong><small>見本と描画スペースを表示し、最後に自動評価します</small>
        </button>
        <button className={settings.practiceMode === 'sample-only' ? 'choice-button selected' : 'choice-button'} type="button" aria-pressed={settings.practiceMode === 'sample-only'} onClick={() => changeSettings({ practiceMode: 'sample-only' })}>
          <strong>見本のみ表示</strong><small>使い慣れたペイントソフトで描くため、見本を大きく表示します</small>
        </button>
      </div>
    </section>
  </>;
}
