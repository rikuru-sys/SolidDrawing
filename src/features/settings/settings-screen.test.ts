import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { freshDefaultSettings, type Settings } from './practice-settings';
import { SettingsScreen } from './settings-screen';

function renderSettings(settings: Settings) {
  return renderToStaticMarkup(createElement(SettingsScreen, {
    settings,
    setSettings: () => undefined,
    validation: '',
    onValidationClear: () => undefined,
    onStart: () => undefined,
    onBack: () => undefined,
  }));
}

describe('SettingsScreen', () => {
  it('renders all default drawing settings and added time choices', () => {
    const html = renderSettings(freshDefaultSettings());

    expect(html).toContain('練習の設定');
    expect(html).toContain('15秒');
    expect(html).toContain('45秒');
    expect(html).toContain('回数と描画ツール');
    expect(html).toContain('見本と描画スペースの配置');
    expect(html).not.toContain('type="number" min="0"');
  });

  it('hides drawing-tool and layout settings in sample-only mode', () => {
    const html = renderSettings({
      ...freshDefaultSettings(),
      practiceMode: 'sample-only',
    });

    expect(html).toContain('<h3>練習回数</h3>');
    expect(html).not.toContain('手振れ補正');
    expect(html).not.toContain('見本と描画スペースの配置');
  });

  it('shows fixed-seed and light-direction controls when enabled', () => {
    const html = renderSettings({
      ...freshDefaultSettings(),
      seedMode: 'fixed',
      sampleStyle: 'shadow',
    });

    expect(html).toContain('シード値');
    expect(html).toContain('使用する光源方向');
    expect(html).toContain('別のシードを作成');
  });
});
