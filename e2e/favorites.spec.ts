import { expect, test } from './fixtures/app-fixture';

test('結果をお気に入りへ追加して確認できる', async ({ app, page }) => {
  await app.open({ practiceMode: 'sample-only' });
  await app.startPractice();
  await app.finishSampleOnlyPractice();

  await page.getByRole('button', { name: 'お気に入りに追加' }).click();
  await expect(page.getByRole('button', { name: 'お気に入り済み' })).toBeVisible();
  await page.getByRole('button', { name: 'トップへ戻る' }).click();
  await page.getByRole('button', { name: 'お気に入り' }).click();

  await expect(page.getByRole('heading', { name: 'お気に入り' })).toBeVisible();
  await expect(page.getByRole('button', { name: /立方体/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'この見本でもう一度' })).toBeVisible();
});

test('お気に入りに保存した見本を再練習できる', async ({ app, page }) => {
  await app.open({ practiceMode: 'sample-only' });
  await app.startPractice();
  await app.finishSampleOnlyPractice();
  await page.getByRole('button', { name: 'お気に入りに追加' }).click();
  await page.getByRole('button', { name: 'トップへ戻る' }).click();
  await page.getByRole('button', { name: 'お気に入り' }).click();

  await page.getByRole('button', { name: 'この見本でもう一度' }).click();

  await expect(page.getByText('1 / 1')).toBeVisible();
  await expect(page.getByText('立方体', { exact: true })).toBeVisible();
});

test('お気に入りを確認してから削除する', async ({ app, page }) => {
  await app.open({ practiceMode: 'sample-only' });
  await app.startPractice();
  await app.finishSampleOnlyPractice();
  await page.getByRole('button', { name: 'お気に入りに追加' }).click();
  await page.getByRole('button', { name: 'トップへ戻る' }).click();
  await page.getByRole('button', { name: 'お気に入り' }).click();

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toBe('選択中の見本をお気に入りから削除しますか？');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'お気に入りから削除' }).click();

  await expect(page.getByText('お気に入りはまだありません')).toBeVisible();
});
