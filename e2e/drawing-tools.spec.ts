import { expect, test } from './fixtures/app-fixture';

test('描画ツールを切り替え、元に戻す・やり直す・全消去を操作できる', async ({ app, page }) => {
  await app.open();
  await app.startPractice();

  for (const tool of ['点線', '補助線', '消しゴム', 'ペン']) {
    const button = page.getByRole('button', { name: tool, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }

  await app.drawLine();
  const undo = page.getByRole('button', { name: '元に戻す' });
  const redo = page.getByRole('button', { name: 'やり直す' });
  const clear = page.getByRole('button', { name: '全消去' });
  await expect(undo).toBeEnabled();
  await expect(clear).toBeEnabled();

  await undo.click();
  await expect(redo).toBeEnabled();
  await redo.click();
  await expect(undo).toBeEnabled();

  await clear.click();
  await expect(undo).toBeDisabled();
  await expect(clear).toBeDisabled();
});

test('影ペンは輪郭線と影の練習だけに表示する', async ({ app, page }) => {
  await app.open();
  await app.startPractice();
  await expect(page.getByRole('button', { name: '影', exact: true })).toHaveCount(0);

  await app.open({ sampleStyle: 'shadow' });
  await app.startPractice();

  const shadowPen = page.getByRole('button', { name: '影', exact: true });
  await expect(shadowPen).toBeVisible();
  await shadowPen.click();
  await expect(shadowPen).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.light-direction-badge')).toContainText('光源 左上');
});

test('練習中にペンの太さ・手振れ・色・不透明度を変更できる', async ({ app, page }) => {
  await app.open();
  await app.startPractice();

  await page.getByLabel('練習中のペンの太さ').selectOption('5');
  await page.getByLabel('練習中の手振れ補正').selectOption('medium');
  await page.getByLabel('練習中のペン色').fill('#ff0000');
  await page.getByLabel('練習中のペンの不透明度').fill('0.5');

  await expect(page.getByLabel('練習中のペンの太さ')).toHaveValue('5');
  await expect(page.getByLabel('練習中の手振れ補正')).toHaveValue('medium');
  await expect(page.getByLabel('練習中のペン色')).toHaveValue('#ff0000');
  await expect(page.getByLabel('練習中のペンの不透明度')).toHaveValue('0.5');
  await expect(page.getByText('濃さ 50%')).toBeVisible();
});
