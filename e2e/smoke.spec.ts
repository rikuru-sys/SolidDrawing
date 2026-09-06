import { expect, test } from './fixtures/app-fixture';

test('サイト内で描いて練習結果へ進める', async ({ app, page }) => {
  await app.open();
  await app.startPractice();
  await app.drawLine();
  await expect(page.getByRole('button', { name: '元に戻す' })).toBeEnabled();

  await app.finishCanvasPractice();
  await expect(page.getByText('1回完了')).toBeVisible();
  await expect(page.getByText(/^シード \d+$/)).toBeVisible();
});

test('見本のみモードで結果画面へ進める', async ({ app, page }) => {
  await app.open({ practiceMode: 'sample-only' });
  await app.startPractice();

  await expect(page.getByLabel('描画キャンバス')).toHaveCount(0);
  await app.finishSampleOnlyPractice();
  await expect(page.getByRole('button', { name: '見本画像を保存' })).toBeVisible();
});
