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

  it('見本のみモードでも次回利用できる描画ツール設定を表示する', () => {
    const html = renderSettings({
      ...freshDefaultSettings(),
      practiceMode: 'sample-only',
    });

    expect(html).toContain('<h3>回数と描画ツール</h3>');
    expect(html).toContain('手振れ補正');
    expect(html).not.toContain('見本と描画スペースの配置');
  });

  it('影を選んだ場合は光源方向の設定を表示する', () => {
    const html = renderSettings({
      ...freshDefaultSettings(),
      sampleStyle: 'shadow',
    });

    expect(html).toContain('使用する光源方向');
    expect(html.indexOf('輪郭線と影')).toBeLessThan(html.indexOf('使用する光源方向'));
    expect(html.indexOf('使用する光源方向')).toBeLessThan(html.indexOf('練習中の表示時間'));
  });

  it('影以外の場合は光源方向の設定を表示しない', () => {
    const html = renderSettings(freshDefaultSettings());

    expect(html).not.toContain('使用する光源方向');
  });
});
