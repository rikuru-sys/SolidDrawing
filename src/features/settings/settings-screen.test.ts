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
    expect(html).not.toContain('出題の再現');
    expect(html).not.toContain('シード値');
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

  it('影を選んだ場合は光源方向の設定を表示する', () => {
    const html = renderSettings({
      ...freshDefaultSettings(),
      sampleStyle: 'shadow',
    });

    expect(html).toContain('使用する光源方向');
  });
});
