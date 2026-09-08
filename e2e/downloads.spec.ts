import type { Download, Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures/app-fixture';

async function downloadByClick(page: Page, button: Locator): Promise<Download> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    button.click(),
  ]);
  expect(await download.failure()).toBeNull();
  return download;
}

test('描画・比較・重ね合わせ・全結果をPNGで保存できる', async ({ app, page }) => {
  await app.open();
  await app.startPractice();
  await app.drawLine();
  await app.finishCanvasPractice();

  const drawing = await downloadByClick(
    page,
    page.getByRole('button', { name: '描画だけ保存' }),
  );
  expect(drawing.suggestedFilename()).toMatch(
    /^立体ドローイング_描画_1_立方体_.+\.png$/,
  );

  await page.getByRole('button', { name: '横並び' }).click();
  const comparison = await downloadByClick(
    page,
    page.getByRole('button', { name: '比較画像を保存' }),
  );
  expect(comparison.suggestedFilename()).toMatch(
    /^立体ドローイング_比較_1_立方体_.+\.png$/,
  );

  await page.getByRole('button', { name: '重ね合わせ', exact: true }).click();
  const overlay = await downloadByClick(
    page,
    page.getByRole('button', { name: '重ね合わせ画像を保存' }),
  );
  expect(overlay.suggestedFilename()).toMatch(
    /^立体ドローイング_重ね合わせ_1_立方体_.+\.png$/,
  );

  const allResults = await downloadByClick(
    page,
    page.getByRole('button', { name: '全結果を保存' }),
  );
  expect(allResults.suggestedFilename()).toMatch(
    /^立体ドローイング_全結果_.+\.png$/,
  );

  const allOverlayResults = await downloadByClick(
    page,
    page.getByRole('button', { name: '全結果を重ね合わせで保存' }),
  );
  expect(allOverlayResults.suggestedFilename()).toMatch(
    /^立体ドローイング_全結果_重ね合わせ_.+\.png$/,
  );
});

test('見本のみモードでは見本画像をPNGで保存できる', async ({ app, page }) => {
  await app.open({ practiceMode: 'sample-only' });
  await app.startPractice();
  await app.finishSampleOnlyPractice();

  const sample = await downloadByClick(
    page,
    page.getByRole('button', { name: '見本画像を保存' }),
  );
  expect(sample.suggestedFilename()).toMatch(
    /^立体ドローイング_見本_1_立方体_.+\.png$/,
  );
});
