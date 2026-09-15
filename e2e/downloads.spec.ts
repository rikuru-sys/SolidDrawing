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

for (const sampleStyle of ['hidden-lines', 'shadow'] as const) {
test(`${sampleStyle}の一括画像を余白を除いて拡大し4列で保存できる`, async ({ app, page }, testInfo) => {
  await app.open({ count: 5, sampleStyle });
  await app.startPractice();
  for (let index = 0; index < 5; index += 1) {
    await expect(page.locator('.practice-section')).toHaveAttribute('aria-busy', 'false');
    const box = await page.getByLabel('描画キャンバス').boundingBox();
    if (!box) throw new Error('Canvas not found');
    await page.mouse.move(box.x + box.width * 0.47, box.y + box.height * 0.47);
    await page.mouse.down();
    for (const [x, y] of [[0.53, 0.47], [0.53, 0.53], [0.47, 0.53], [0.47, 0.47]]) {
      await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 3 });
    }
    await page.mouse.up();
    await page.getByRole('button', { name: '保存して次へ' }).click();
    if (index < 4) await expect(page.getByText(`${index + 2} / 5`)).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: '練習結果' })).toBeVisible();
  for (const [mode, buttonName, expectedHeight, pane] of [
    ['overlay', '全結果を重ね合わせで保存', 1160, { x: 58, y: 300, width: 329, height: 292 }],
    ['side-by-side', '全結果を保存', 1510, { x: 58, y: 254, width: 350, height: 292 }],
  ] as const) {
    const download = await downloadByClick(page, page.getByRole('button', { name: buttonName, exact: true }));
    const path = testInfo.outputPath(`${mode}.png`);
    await download.saveAs(path);
    await testInfo.attach(mode, { path, contentType: 'image/png' });
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const source = `data:image/png;base64,${Buffer.concat(chunks).toString('base64')}`;
    const size = await page.evaluate(async ({ source, pane }) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(pane.x, pane.y, pane.width, pane.height).data;
      let left: number = pane.width;
      let top: number = pane.height;
      let right = -1, bottom = -1;
      for (let y = 0; y < pane.height; y += 1) for (let x = 0; x < pane.width; x += 1) {
        const offset = (y * pane.width + x) * 4;
        if (Math.min(pixels[offset], pixels[offset + 1], pixels[offset + 2]) > 220) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      return { width: image.naturalWidth, height: image.naturalHeight,
        extent: Math.max((right - left + 1) / pane.width, (bottom - top + 1) / pane.height),
        margin: Math.min(left, top, pane.width - 1 - right, pane.height - 1 - bottom) };
    }, { source, pane });
    expect(size.width).toBe(1600);
    expect(size.height).toBe(expectedHeight);
    if (mode === 'overlay') {
      expect(size.extent).toBeGreaterThan(0.7);
      expect(size.margin).toBeGreaterThan(3);
    }
  }
});
}
