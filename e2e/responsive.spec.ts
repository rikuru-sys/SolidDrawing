import { expect, test } from './fixtures/app-fixture';
import {
  expectNoHorizontalScroll,
  expectNoVerticalScroll,
  imageContentMargins,
} from './helpers/layout';

const responsiveViewports = [
  { name: 'デスクトップ', width: 1440, height: 900 },
  { name: '広い横長画面', width: 1920, height: 826 },
  { name: '中程度の横長画面', width: 1280, height: 700 },
  { name: '液タブ横長画面', width: 1280, height: 551 },
  { name: '縦長画面', width: 390, height: 844 },
] as const;

test('横長の見本のみモードを縦スクロールなしで表示する', async ({ app, page }) => {
  const viewport = { width: 1518, height: 664 };
  await page.setViewportSize(viewport);
  await app.open({
    practiceMode: 'sample-only',
    sampleStyle: 'hidden-lines',
    shapes: ['円錐'],
  });
  await app.startPractice();

  await expectNoVerticalScroll(page, viewport.height);
  await expect(page.getByRole('button', { name: '次の見本へ' })).toBeInViewport();

  await app.finishSampleOnlyPractice();
  const margins = await imageContentMargins(page.getByRole('img', { name: '円錐の見本' }));
  expect(margins).not.toBeNull();
  expect(margins?.top).toBeGreaterThan(4);
  expect(margins?.bottom).toBeLessThan((margins?.height ?? 0) - 5);
});

test('スマートフォンの比較画像に十分な高さを確保する', async ({ app, page }) => {
  const viewport = { width: 390, height: 844 };
  await page.setViewportSize(viewport);
  await app.open();
  await app.startPractice();
  await app.drawLine();
  await app.finishCanvasPractice();

  const panes = page.locator('.comparison-panes:not(.sample-only-result) .compare-pane > div');
  await expect(panes).toHaveCount(2);
  const paneBoxes = await Promise.all((await panes.all()).map((pane) => pane.boundingBox()));
  for (const paneBox of paneBoxes) {
    expect(paneBox).not.toBeNull();
    expect(paneBox?.height).toBeGreaterThanOrEqual(260);
    expect(paneBox?.height).toBeGreaterThan((paneBox?.width ?? 0) * 0.75);
  }
  await expectNoHorizontalScroll(page, viewport.width);
});

for (const viewport of responsiveViewports) {
  test(`${viewport.name}で主要操作と描画領域が画面幅に収まる`, async ({ app, page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await app.open();

    const startButton = page.getByRole('button', { name: '開始する' });
    await startButton.scrollIntoViewIfNeeded();
    await expect(startButton).toBeInViewport();
    await expectNoHorizontalScroll(page, viewport.width);

    await app.startPractice();
    const nextButton = page.getByRole('button', { name: '保存して次へ' });

    if (viewport.width > viewport.height) {
      await expectNoVerticalScroll(page, viewport.height);
      const footerBox = await page.locator('.practice-footer').boundingBox();
      expect(footerBox).not.toBeNull();
      const bottomGap = footerBox
        ? viewport.height - footerBox.y - footerBox.height
        : viewport.height;
      expect(bottomGap).toBeLessThanOrEqual(24);
    }

    await nextButton.scrollIntoViewIfNeeded();
    await expect(nextButton).toBeInViewport();
    await expectNoHorizontalScroll(page, viewport.width);

    const sampleBox = await page.getByLabel('立方体の見本').boundingBox();
    const drawingBox = await page.getByLabel('描画キャンバス').boundingBox();
    expect(sampleBox?.width).toBeCloseTo(drawingBox?.width ?? 0, 0);
    expect(sampleBox?.height).toBeCloseTo(drawingBox?.height ?? 0, 0);
  });
}
