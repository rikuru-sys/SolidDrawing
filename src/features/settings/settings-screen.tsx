'use client';

import type { Dispatch, SetStateAction } from 'react';
import {
  toggleLightDirectionSelection,
  toggleShapeSelection,
  updateSettings,
  type Settings,
} from './practice-settings';
import { DrawingSettingsSection } from './sections/drawing-settings-section';
import { LayoutSettingsSection } from './sections/layout-settings-section';
import { PracticeSetupSection } from './sections/practice-setup-section';
import { QuestionSettingsSection } from './sections/question-settings-section';
import { SampleSettingsSection } from './sections/sample-settings-section';

export type SettingsScreenProps = {
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  validation: string;
  onValidationClear: () => void;
  onStart: () => void;
  onBack: () => void;
};

export function SettingsScreen({ settings, setSettings, validation, onValidationClear, onStart, onBack }: SettingsScreenProps) {
  function changeSettings(patch: Partial<Settings>) {
    setSettings((current) => updateSettings(current, patch));
  }

  function toggleShape(shape: Settings['shapes'][number]) {
    setSettings((current) => toggleShapeSelection(current, shape));
    onValidationClear();
  }

  function toggleLightDirection(direction: Settings['lightDirections'][number]) {
    setSettings((current) => toggleLightDirectionSelection(current, direction));
    onValidationClear();
  }

  return <section className="settings-section">
    <div className="section-heading">
      <div><h2>練習の設定</h2><p>今日の練習内容を選びます。</p></div>
      <button className="text-button" type="button" onClick={onBack}>トップへ戻る</button>
    </div>
    <div className="settings-grid">
      <PracticeSetupSection settings={settings} changeSettings={changeSettings} />
      <QuestionSettingsSection settings={settings} changeSettings={changeSettings} onToggleShape={toggleShape} />
      <DrawingSettingsSection settings={settings} changeSettings={changeSettings} />
      <SampleSettingsSection settings={settings} changeSettings={changeSettings} onToggleLightDirection={toggleLightDirection} />
      <LayoutSettingsSection settings={settings} changeSettings={changeSettings} />
    </div>
    {validation && <p className="validation-message" role="alert">{validation}</p>}
    <div className="settings-footer"><button className="button primary" type="button" onClick={onStart}>この設定で始める</button></div>
  </section>;
}
