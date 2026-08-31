import { clampSeed, createSessionSeed, MAX_SEED } from '../../../domain/random/seeded-random';
import type { Settings } from '../practice-settings';
import type { ChangeSettings } from './types';

type Props = { settings: Settings; changeSettings: ChangeSettings };

export function SeedSettingsSection({ settings, changeSettings }: Props) {
  return <section className="settings-card wide-card">
    <h3>出題の再現</h3>
    <div className="difficulty-options">
      <button className={settings.seedMode === 'random' ? 'choice-button selected' : 'choice-button'} type="button" aria-pressed={settings.seedMode === 'random'} onClick={() => changeSettings({ seedMode: 'random' })}>
        <strong>毎回ランダム</strong><small>練習を始めるたびに新しいシードを作成します</small>
      </button>
      <button className={settings.seedMode === 'fixed' ? 'choice-button selected' : 'choice-button'} type="button" aria-pressed={settings.seedMode === 'fixed'} onClick={() => changeSettings({ seedMode: 'fixed' })}>
        <strong>固定シード</strong><small>同じ設定とシードから同じ順番・向きの立体を出題します</small>
      </button>
    </div>
    {settings.seedMode === 'fixed' && <div className="seed-controls">
      <label className="field-label">シード値
        <input type="number" min="0" max={MAX_SEED} step="1" value={settings.fixedSeed} onChange={(event) => changeSettings({ fixedSeed: clampSeed(event.currentTarget.valueAsNumber) })} />
        <small>0〜{MAX_SEED.toLocaleString('ja-JP')}の整数</small>
      </label>
      <button className="button secondary compact" type="button" onClick={() => changeSettings({ fixedSeed: createSessionSeed() })}>別のシードを作成</button>
    </div>}
    <p className="setting-note">再現には、シード値に加えて選択した立体・難易度・光源などの設定も同じにしてください。使用したシードは結果画面に表示します。</p>
  </section>;
}
