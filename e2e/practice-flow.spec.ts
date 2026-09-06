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

test('横長の見本のみモードを縦スクロールなしで表示する', async ({ page }) => {
  const viewport = { width: 1518, height: 664 };
  await page.setViewportSize(viewport);
  await openWithSettings(page, {
    practiceMode: 'sample-only',
    sampleStyle: 'hidden-lines',
    shapes: ['円錐'],
  });
  await startPractice(page);

  expect(await page.evaluate(() => document.documentElement.scrollHeight))
    .toBeLessThanOrEqual(viewport.height);
  await expect(page.getByRole('button', { name: '次の見本へ' })).toBeInViewport();

  await page.getByRole('button', { name: '次の見本へ' }).click();
  const imageMargins = await page.getByRole('img', { name: '円錐の見本' }).evaluate((element) => {
    const image = element as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let top = canvas.height;
    let bottom = -1;

    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const index = (y * canvas.width + x) * 4;
        const isVisibleLine = pixels[index + 3] > 0
          && (pixels[index] < 235 || pixels[index + 1] < 235 || pixels[index + 2] < 235);
        if (!isVisibleLine) continue;
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }

    return { top, bottom, height: canvas.height };
  });

  expect(imageMargins).not.toBeNull();
  expect(imageMargins?.top).toBeGreaterThan(4);
  expect(imageMargins?.bottom).toBeLessThan((imageMargins?.height ?? 0) - 5);
});

test('設定画面の描画ツールを同じ高さで表示する', async ({ page }) => {
  await openWithSettings(page);
  await page.getByRole('button', { name: '設定する' }).click();

  const countBox = await page.getByLabel('練習回数').boundingBox();
  const penWidthBox = await page.getByLabel('線の太さ').boundingBox();
  const penColorBox = await page.locator('.color-setting').boundingBox();
  const penOpacityBox = await page.locator('.opacity-setting').boundingBox();

  expect(countBox).not.toBeNull();
  expect(penWidthBox).not.toBeNull();
  expect(penColorBox).not.toBeNull();
  expect(penOpacityBox).not.toBeNull();
  expect(penWidthBox?.height).toBeCloseTo(countBox?.height ?? 0, 0);
  expect(penColorBox?.height).toBeCloseTo(countBox?.height ?? 0, 0);
  expect(penOpacityBox?.height).toBeCloseTo(countBox?.height ?? 0, 0);
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

test('mobile comparison panes keep enough height for both images', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWithSettings(page);
  await page.locator('.hero-actions .button.primary').click();

  const drawingCanvas = page.locator('.drawing-canvas');
  const bounds = await drawingCanvas.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;
  await page.mouse.move(bounds.x + bounds.width * 0.3, bounds.y + bounds.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.6);
  await page.mouse.up();
  await page.locator('.practice-footer .button.primary').click();

  const panes = page.locator('.comparison-panes:not(.sample-only-result) .compare-pane > div');
  await expect(panes).toHaveCount(2);
  const paneBoxes = await Promise.all((await panes.all()).map((pane) => pane.boundingBox()));
  for (const paneBox of paneBoxes) {
    expect(paneBox).not.toBeNull();
    expect(paneBox?.height).toBeGreaterThanOrEqual(260);
    expect(paneBox?.height).toBeGreaterThan((paneBox?.width ?? 0) * 0.75);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
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
