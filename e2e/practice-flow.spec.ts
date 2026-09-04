import { expect, test, type Page } from '@playwright/test';
import type { Settings } from '../src/features/settings/practice-settings';

const SETTINGS_STORAGE_KEY = 'solid-drawing-settings';

const testSettings: Settings = {
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
  seedMode: 'fixed',
  fixedSeed: 24680,
};

async function openWithSettings(
  page: Page,
  overrides: Partial<typeof testSettings> = {},
) {
  await page.goto('./');
  await page.evaluate(
    ({ key, settings }) => localStorage.setItem(key, JSON.stringify(settings)),
    {
      key: SETTINGS_STORAGE_KEY,
      settings: { ...testSettings, ...overrides },
    },
  );
  await page.reload();
}

async function startPractice(page: Page) {
  await page.getByRole('button', { name: '開始する' }).click();
  await expect(page.getByText('1 / 1')).toBeVisible();
}

test('サイト内で描いて練習結果へ進める', async ({ page }) => {
  await openWithSettings(page);
  await startPractice(page);

  const canvas = page.getByLabel('描画キャンバス');
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;

  await page.mouse.move(bounds.x + bounds.width * 0.3, bounds.y + bounds.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.6, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.getByRole('button', { name: '元に戻す' })).toBeEnabled();

  await page.getByRole('button', { name: '保存して次へ' }).click();
  await expect(page.getByRole('heading', { name: '練習結果' })).toBeVisible();
  await expect(page.getByText('1回完了')).toBeVisible();
  await expect(page.getByText('シード 24680')).toBeVisible();
});

test('見本のみモードで結果画面へ進める', async ({ page }) => {
  await openWithSettings(page, { practiceMode: 'sample-only' });
  await startPractice(page);

  await expect(page.getByLabel('描画キャンバス')).toHaveCount(0);
  await page.getByRole('button', { name: '次の見本へ' }).click();

  await expect(page.getByRole('heading', { name: '練習結果' })).toBeVisible();
  await expect(page.getByRole('button', { name: '見本画像を保存' })).toBeVisible();
});

test('結果をお気に入りへ追加して確認できる', async ({ page }) => {
  await openWithSettings(page, { practiceMode: 'sample-only' });
  await startPractice(page);
  await page.getByRole('button', { name: '次の見本へ' }).click();

  await page.getByRole('button', { name: 'お気に入りに追加' }).click();
  await expect(page.getByRole('button', { name: 'お気に入り済み' })).toBeVisible();
  await page.getByRole('button', { name: 'トップへ戻る' }).click();
  await page.getByRole('button', { name: 'お気に入り' }).click();

  await expect(page.getByRole('heading', { name: 'お気に入り' })).toBeVisible();
  await expect(page.getByRole('button', { name: /立方体/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'この見本でもう一度' })).toBeVisible();
});

test('1280×551で主要操作と描画領域が画面幅に収まる', async ({ page }) => {
  await openWithSettings(page);

  const startButton = page.getByRole('button', { name: '開始する' });
  await expect(startButton).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);

  await startPractice(page);
  await expect(page.getByRole('button', { name: '保存して次へ' })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);

  const sampleBox = await page.getByLabel('立方体の見本').boundingBox();
  const drawingBox = await page.getByLabel('描画キャンバス').boundingBox();
  expect(sampleBox?.width).toBeCloseTo(drawingBox?.width ?? 0, 0);
  expect(sampleBox?.height).toBeCloseTo(drawingBox?.height ?? 0, 0);
});
