import {
  expect,
  test as base,
  type Locator,
  type Page,
} from '@playwright/test';
import type { Settings } from '../../src/features/settings/practice-settings';
import { SETTINGS_SCHEMA_VERSION } from '../../src/features/settings/practice-settings-storage';

const SETTINGS_STORAGE_KEY = 'solid-drawing-settings';

export const DEFAULT_TEST_SETTINGS: Settings = {
  shapes: ['立方体'],
  time: null,
  count: 1,
  layout: 'left',
  penWidth: 3,
  penColor: '#30322c',
  penOpacity: 1,
  sampleStyle: 'shaded',
  lightDirections: ['top-left'],
  difficulty: 'easy',
  sampleVisibility: 'always',
  practiceMode: 'canvas',
  stabilization: 'off',
};

export class AppDriver {
  private settings = DEFAULT_TEST_SETTINGS;

  constructor(readonly page: Page) {}

  async open(overrides: Partial<Settings> = {}) {
    this.settings = { ...DEFAULT_TEST_SETTINGS, ...overrides };
    await this.page.goto('./');
    await this.page.evaluate(
      ({ key, schemaVersion, settings }) => {
        localStorage.clear();
        localStorage.setItem(key, JSON.stringify({
          schemaVersion,
          settings,
        }));
      },
      {
        key: SETTINGS_STORAGE_KEY,
        schemaVersion: SETTINGS_SCHEMA_VERSION,
        settings: this.settings,
      },
    );
    await this.page.reload();
  }

  async startPractice() {
    await this.page.getByRole('button', { name: '開始する' }).click();
    await expect(this.page.getByText(`1 / ${this.settings.count}`)).toBeVisible();
  }

  async drawLine(canvas: Locator = this.page.getByLabel('描画キャンバス')) {
    await expect(canvas).toBeVisible();
    const bounds = await canvas.boundingBox();
    expect(bounds).not.toBeNull();
    if (!bounds) throw new Error('描画キャンバスの表示範囲を取得できませんでした。');

    await this.page.mouse.move(
      bounds.x + bounds.width * 0.3,
      bounds.y + bounds.height * 0.4,
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      bounds.x + bounds.width * 0.7,
      bounds.y + bounds.height * 0.6,
      { steps: 8 },
    );
    await this.page.mouse.up();
  }

  async finishCanvasPractice() {
    await this.page.getByRole('button', { name: '保存して次へ' }).click();
    await expect(this.page.getByRole('heading', { name: '練習結果' })).toBeVisible();
  }

  async finishSampleOnlyPractice() {
    await this.page.getByRole('button', { name: '次の見本へ' }).click();
    await expect(this.page.getByRole('heading', { name: '練習結果' })).toBeVisible();
  }
}

type AppFixtures = {
  app: AppDriver;
};

export const test = base.extend<AppFixtures>({
  app: async ({ page }, provideFixture) => {
    await provideFixture(new AppDriver(page));
  },
});

export { expect };
