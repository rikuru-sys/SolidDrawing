'use client';

import type { Dispatch, SetStateAction } from 'react';
import { clampSeed, createSessionSeed, MAX_SEED } from '../../domain/random/seeded-random';
import type { Stabilization } from '../drawing/types';
import {
  ALL_SHAPES,
  TIME_CHOICES,
  toggleLightDirectionSelection,
  toggleShapeSelection,
  updateSettings,
  type Settings,
} from './practice-settings';
import { LAYOUT_OPTIONS, LIGHT_DIRECTION_OPTIONS } from './settings-options';

export type SettingsScreenProps = {
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  validation: string;
  onValidationClear: () => void;
  onStart: () => void;
  onBack: () => void;
};

export function SettingsScreen({
  settings,
  setSettings,
  validation,
  onValidationClear,
  onStart,
  onBack,
}: SettingsScreenProps) {
  const changeSettings = (patch: Partial<Settings>) => {
    setSettings((current) => updateSettings(current, patch));
  };

  const toggleShape = (shape: Settings['shapes'][number]) => {
    setSettings((current) => toggleShapeSelection(current, shape));
    onValidationClear();
  };

  const toggleLightDirection = (direction: Settings['lightDirections'][number]) => {
    setSettings((current) => toggleLightDirectionSelection(current, direction));
    onValidationClear();
  };

  return (
    <section className="settings-section">
      <div className="section-heading">
        <div><h2>練習の設定</h2><p>今日の練習内容を選びます。</p></div>
        <button className="text-button" type="button" onClick={onBack}>トップへ戻る</button>
      </div>
      <div className="settings-grid">
        <section className="settings-card wide-card">
          <h3>難易度</h3>
          <div className="difficulty-options">
            <button
              className={settings.difficulty === 'easy' ? 'choice-button selected' : 'choice-button'}
              type="button"
              aria-pressed={settings.difficulty === 'easy'}
              onClick={() => changeSettings({ difficulty: 'easy' })}
            >
              <strong>簡単</strong>
              <small>現在と同じく、立体を直立させたまま見る方向を変えます</small>
            </button>
            <button
              className={settings.difficulty === 'hard' ? 'choice-button selected' : 'choice-button'}
              type="button"
              aria-pressed={settings.difficulty === 'hard'}
              onClick={() => changeSettings({ difficulty: 'hard' })}
            >
              <strong>難しい</strong>
              <small>立体そのものを上下・左右・傾き方向へランダムに回転します</small>
            </button>
          </div>
        </section>
        <section className="settings-card wide-card">
          <h3>練習方法</h3>
          <div className="difficulty-options">
            <button
              className={settings.practiceMode === 'canvas' ? 'choice-button selected' : 'choice-button'}
              type="button"
              aria-pressed={settings.practiceMode === 'canvas'}
              onClick={() => changeSettings({ practiceMode: 'canvas' })}
            >
              <strong>サイト内で描く</strong>
              <small>見本と描画スペースを表示し、最後に自動評価します</small>
            </button>
            <button
              className={settings.practiceMode === 'sample-only' ? 'choice-button selected' : 'choice-button'}
              type="button"
              aria-pressed={settings.practiceMode === 'sample-only'}
              onClick={() => changeSettings({ practiceMode: 'sample-only' })}
            >
              <strong>見本のみ表示</strong>
              <small>使い慣れたペイントソフトで描くため、見本を大きく表示します</small>
            </button>
          </div>
        </section>
        <section className="settings-card wide-card">
          <h3>出題の再現</h3>
          <div className="difficulty-options">
            <button
              className={settings.seedMode === 'random' ? 'choice-button selected' : 'choice-button'}
              type="button"
              aria-pressed={settings.seedMode === 'random'}
              onClick={() => changeSettings({ seedMode: 'random' })}
            >
              <strong>毎回ランダム</strong>
              <small>練習を始めるたびに新しいシードを作成します</small>
            </button>
            <button
              className={settings.seedMode === 'fixed' ? 'choice-button selected' : 'choice-button'}
              type="button"
              aria-pressed={settings.seedMode === 'fixed'}
              onClick={() => changeSettings({ seedMode: 'fixed' })}
            >
              <strong>固定シード</strong>
              <small>同じ設定とシードから同じ順番・向きの立体を出題します</small>
            </button>
          </div>
          {settings.seedMode === 'fixed' && (
            <div className="seed-controls">
              <label className="field-label">シード値
                <input
                  type="number"
                  min="0"
                  max={MAX_SEED}
                  step="1"
                  value={settings.fixedSeed}
                  onChange={(event) => changeSettings({
                    fixedSeed: clampSeed(event.currentTarget.valueAsNumber),
                  })}
                />
                <small>0〜{MAX_SEED.toLocaleString('ja-JP')}の整数</small>
              </label>
              <button
                className="button secondary compact"
                type="button"
                onClick={() => changeSettings({ fixedSeed: createSessionSeed() })}
              >
                別のシードを作成
              </button>
            </div>
          )}
          <p className="setting-note">再現には、シード値に加えて選択した立体・難易度・光源などの設定も同じにしてください。使用したシードは結果画面に表示します。</p>
        </section>
        <section className="settings-card">
          <h3>出題する立体</h3>
          <div className="shape-options">
            {ALL_SHAPES.map((shape) => (
              <label key={shape} className="check-option">
                <input type="checkbox" checked={settings.shapes.includes(shape)} onChange={() => toggleShape(shape)} />
                {shape}
              </label>
            ))}
          </div>
        </section>
        <section className="settings-card">
          <h3>1回の制限時間</h3>
          <div className="time-options">
            {TIME_CHOICES.map((time) => (
              <button
                key={time ?? 'none'}
                className={settings.time === time ? 'choice-button selected' : 'choice-button'}
                type="button"
                aria-pressed={settings.time === time}
                onClick={() => changeSettings({ time })}
              >
                {time === null ? '指定なし' : `${time}秒`}
              </button>
            ))}
          </div>
        </section>
        <section className="settings-card">
          <h3>{settings.practiceMode === 'sample-only' ? '練習回数' : '回数と描画ツール'}</h3>
          <div className={settings.practiceMode === 'sample-only' ? 'field-grid single-field-grid' : 'field-grid'}>
            <label className="field-label">練習回数
              <input type="number" min="1" max="20" value={settings.count} onChange={(event) => changeSettings({ count: Number(event.target.value) })} />
              <small>1〜20回</small>
            </label>
            {settings.practiceMode === 'canvas' && (
              <>
                <label className="field-label">線の太さ
                  <select value={settings.penWidth} onChange={(event) => changeSettings({ penWidth: Number(event.target.value) })}>
                    <option value="2">細い</option><option value="3">普通</option><option value="5">太い</option>
                  </select>
                </label>
                <label className="field-label">手振れ補正
                  <select value={settings.stabilization} onChange={(event) => changeSettings({ stabilization: event.target.value as Stabilization })}>
                    <option value="off">なし</option><option value="low">弱</option><option value="medium">中</option>
                  </select>
                </label>
                <label className="field-label">ペン色
                  <span className="color-setting">
                    <input
                      type="color"
                      value={settings.penColor}
                      onChange={(event) => changeSettings({ penColor: event.target.value })}
                      aria-label="ペン色"
                    />
                    <span>{settings.penColor.toUpperCase()}</span>
                  </span>
                </label>
                <label className="field-label">ペンの不透明度
                  <span className="opacity-setting">
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={settings.penOpacity}
                      onChange={(event) => changeSettings({ penOpacity: Number(event.target.value) })}
                      aria-label="ペンの不透明度"
                    />
                    <output>{Math.round(settings.penOpacity * 100)}%</output>
                  </span>
                </label>
              </>
            )}
          </div>
          {settings.practiceMode === 'canvas' && <p className="setting-note">手振れ補正はペン・点線・補助線に適用し、消しゴムは遅延なしで動きます。</p>}
        </section>
        <section className="settings-card">
          <h3>見本の表示</h3>
          <div className="sample-style-options">
            <button
              className={settings.sampleStyle === 'shaded' ? 'choice-button selected' : 'choice-button'}
              type="button"
              aria-pressed={settings.sampleStyle === 'shaded'}
              onClick={() => changeSettings({ sampleStyle: 'shaded' })}
            >輪郭線と薄い陰影</button>
            <button
              className={settings.sampleStyle === 'shadow' ? 'choice-button selected' : 'choice-button'}
              type="button"
              aria-pressed={settings.sampleStyle === 'shadow'}
              onClick={() => changeSettings({ sampleStyle: 'shadow' })}
            >輪郭線と影</button>
            <button
              className={settings.sampleStyle === 'hidden-lines' ? 'choice-button selected' : 'choice-button'}
              type="button"
              aria-pressed={settings.sampleStyle === 'hidden-lines'}
              onClick={() => changeSettings({ sampleStyle: 'hidden-lines' })}
            >輪郭線（見えない部分は点線）</button>
          </div>
          <div className="sample-visibility-setting">
            <h4>練習中の表示時間</h4>
            <div className="difficulty-options">
              <button
                className={settings.sampleVisibility === 'always' ? 'choice-button selected' : 'choice-button'}
                type="button"
                aria-pressed={settings.sampleVisibility === 'always'}
                onClick={() => changeSettings({ sampleVisibility: 'always' })}
              >
                <strong>常に表示</strong>
                <small>練習が終わるまで見本を表示します</small>
              </button>
              <button
                className={settings.sampleVisibility === 'partway' ? 'choice-button selected' : 'choice-button'}
                type="button"
                aria-pressed={settings.sampleVisibility === 'partway'}
                onClick={() => changeSettings({ sampleVisibility: 'partway' })}
              >
                <strong>途中で隠す</strong>
                <small>時間の半分、指定なしは15秒後に隠します</small>
              </button>
            </div>
          </div>
          {settings.sampleStyle === 'shadow' && (
            <fieldset className="light-direction-fieldset">
              <legend>使用する光源方向</legend>
              <div className="light-direction-options">
                {LIGHT_DIRECTION_OPTIONS.map((direction) => (
                  <label className="check-option" key={direction.value}>
                    <input
                      type="checkbox"
                      checked={settings.lightDirections.includes(direction.value)}
                      onChange={() => toggleLightDirection(direction.value)}
                    />
                    <span>{direction.label} <b aria-hidden="true">{direction.arrow}</b></span>
                  </label>
                ))}
              </div>
              <p className="setting-note">選んだ方向の中から、問題ごとに光源をランダム設定します。</p>
            </fieldset>
          )}
          <p className="setting-note">問題ごとに3Dカメラの方向と比率をランダム生成</p>
        </section>
        {settings.practiceMode === 'canvas' && (
          <section className="settings-card wide-card">
            <h3>見本と描画スペースの配置</h3>
            <div className="layout-options">
              {LAYOUT_OPTIONS.map((layout) => (
                <button
                  key={layout.value}
                  className={settings.layout === layout.value ? 'layout-choice selected' : 'layout-choice'}
                  type="button"
                  aria-pressed={settings.layout === layout.value}
                  onClick={() => changeSettings({ layout: layout.value })}
                >
                  <span className={`layout-mini ${layout.value}`} aria-hidden="true"><i /><i /></span>
                  <span>{layout.label}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
      {validation && <p className="validation-message" role="alert">{validation}</p>}
      <div className="settings-footer"><button className="button primary" type="button" onClick={onStart}>この設定で始める</button></div>
    </section>
  );
}
