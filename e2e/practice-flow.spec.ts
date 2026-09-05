import { expect, test, type Page } from '@playwright/test';
import type { Settings } from '../src/features/settings/practice-settings';

const SETTINGS_STORAGE_KEY = 'solid-drawing-settings';

const responsiveViewports = [
  { name: 'デスクトップ', width: 1440, height: 900 },
  { name: '広い横長画面', width: 1920, height: 826 },
  { name: '中程度の横長画面', width: 1280, height: 700 },
  { name: '横長画面', width: 1280, height: 551 },
  { name: '縦長画面', width: 390, height: 844 },
] as const;

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
  await expect(page.getByText(/^シード \d+$/)).toBeVisible();
});

test('見本のみモードで結果画面へ進める', async ({ page }) => {
  await openWithSettings(page, { practiceMode: 'sample-only' });
  await startPractice(page);

  await expect(page.getByLabel('描画キャンバス')).toHaveCount(0);
  await page.getByRole('button', { name: '次の見本へ' }).click();

  await expect(page.getByRole('heading', { name: '練習結果' })).toBeVisible();
  await expect(page.getByRole('button', { name: '見本画像を保存' })).toBeVisible();
});

test('設定画面の練習回数と線の太さを同じ高さで表示する', async ({ page }) => {
  await openWithSettings(page);
  await page.getByRole('button', { name: '設定する' }).click();

  const countBox = await page.getByLabel('練習回数').boundingBox();
  const penWidthBox = await page.getByLabel('線の太さ').boundingBox();

  expect(countBox).not.toBeNull();
  expect(penWidthBox).not.toBeNull();
  expect(penWidthBox?.height).toBeCloseTo(countBox?.height ?? 0, 0);
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

for (const viewport of responsiveViewports) {
  test(`${viewport.name}で主要操作と描画領域が画面幅に収まる`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openWithSettings(page);

    const startButton = page.getByRole('button', { name: '開始する' });
    await startButton.scrollIntoViewIfNeeded();
    await expect(startButton).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(viewport.width);

    await startPractice(page);
    const nextButton = page.getByRole('button', { name: '保存して次へ' });

    if (viewport.width > viewport.height) {
      expect(await page.evaluate(() => document.documentElement.scrollHeight))
        .toBeLessThanOrEqual(viewport.height);
      const footerBox = await page.locator('.practice-footer').boundingBox();
      expect(footerBox).not.toBeNull();
      const bottomGap = footerBox
        ? viewport.height - footerBox.y - footerBox.height
        : viewport.height;
      expect(bottomGap).toBeLessThanOrEqual(24);
    }

    await nextButton.scrollIntoViewIfNeeded();
    await expect(nextButton).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(viewport.width);

    const sampleBox = await page.getByLabel('立方体の見本').boundingBox();
    const drawingBox = await page.getByLabel('描画キャンバス').boundingBox();
    expect(sampleBox?.width).toBeCloseTo(drawingBox?.width ?? 0, 0);
    expect(sampleBox?.height).toBeCloseTo(drawingBox?.height ?? 0, 0);
  });
}
