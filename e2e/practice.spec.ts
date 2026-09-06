import { expect, test } from './fixtures/app-fixture';

test('複数問を順番に保存して結果画面へ進める', async ({ app, page }) => {
  await app.open({ count: 2 });
  await app.startPractice();

  await app.drawLine();
  await page.getByRole('button', { name: '保存して次へ' }).click();
  await expect(page.getByText('2 / 2')).toBeVisible();

  await app.drawLine();
  await app.finishCanvasPractice();
  await expect(page.getByText('2回完了')).toBeVisible();
  await expect(page.getByRole('navigation', { name: '確認する問題' }).getByRole('button'))
    .toHaveCount(2);
});

test('一時停止すると見本を隠し、再開できる', async ({ app, page }) => {
  await app.open();
  await app.startPractice();

  await page.getByRole('button', { name: '一時停止' }).click();
  await expect(page.getByText('一時停止中')).toBeVisible();
  await expect(page.getByLabel('立方体の見本')).toHaveAttribute('aria-hidden', 'true');

  await page.getByRole('button', { name: '再開' }).click();
  await expect(page.getByText('一時停止中')).toHaveCount(0);
  await expect(page.getByLabel('立方体の見本')).toHaveAttribute('aria-hidden', 'false');
});

test('確認後に途中終了し、現在の問題まで結果へ保存する', async ({ app, page }) => {
  await app.open({ count: 3 });
  await app.startPractice();
  await app.drawLine();
  await page.getByRole('button', { name: '保存して次へ' }).click();
  await expect(page.getByText('2 / 3')).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '終了' }).click();
  await expect(page.getByRole('heading', { name: '練習結果' })).toBeVisible();
  await expect(page.getByText('2回完了')).toBeVisible();
});
