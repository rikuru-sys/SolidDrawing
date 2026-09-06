import { expect, test } from './fixtures/app-fixture';

test('制限時間が終了すると自動で結果画面へ進む', async ({ app, page }) => {
  await page.clock.install();
  await app.open({ time: 10 });
  await app.startPractice();

  await page.clock.fastForward(10_100);

  await expect(page.getByRole('heading', { name: '練習結果' })).toBeVisible();
});

test('見本を途中で隠す設定では指定なしなら15秒後に隠れる', async ({ app, page }) => {
  await page.clock.install();
  await app.open({ time: null, sampleVisibility: 'partway' });
  await app.startPractice();

  await expect(page.getByText('あと 15秒で非表示')).toBeVisible();
  await page.clock.fastForward(15_100);

  await expect(page.getByRole('status').filter({ hasText: '見本を隠しました' }))
    .toBeVisible();
});

test('一時停止中は制限時間が進まない', async ({ app, page }) => {
  await page.clock.install();
  await app.open({ time: 10 });
  await app.startPractice();

  await page.clock.fastForward(5_000);
  await page.getByRole('button', { name: '一時停止' }).click();
  await page.clock.fastForward(10_000);
  await expect(page.getByText('1 / 1')).toBeVisible();

  await page.getByRole('button', { name: '再開' }).click();
  await page.clock.fastForward(5_100);
  await expect(page.getByRole('heading', { name: '練習結果' })).toBeVisible();
});
