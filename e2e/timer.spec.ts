import { expect, test } from './fixtures/app-fixture';

test('短い描画と一時停止を繰り返しても実際の制限時間で終了する', async ({ app, page }) => {
  await page.clock.install();
  await app.open({ time: 10 });
  await app.startPractice();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now())));

  for (let index = 0; index < 16; index += 1) {
    await page.clock.runFor(550);
    await page.getByRole('button', { name: '一時停止', exact: true }).click();
    await page.clock.runFor(1000);
    await page.getByRole('button', { name: '再開', exact: true }).click();
  }
  await expect(page.getByRole('timer')).toContainText('00:02');
  await page.clock.runFor(1300);
  await expect(page.getByRole('heading', { name: '練習結果' })).toBeVisible();
  await expect(page.locator('.result-meta')).toContainText('合計 00:10');
});

test('時間制限なしでも一時停止前の端数を経過時間と保存時間へ加算する', async ({ app, page }) => {
  await page.clock.install();
  await app.open();
  await app.startPractice();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now())));

  for (let index = 0; index < 10; index += 1) {
    await page.clock.runFor(550);
    await page.getByRole('button', { name: '一時停止', exact: true }).click();
    await page.clock.runFor(1000);
    await page.getByRole('button', { name: '再開', exact: true }).click();
  }
  await expect(page.getByRole('timer')).toContainText('00:05');
  await app.finishCanvasPractice();
  await expect(page.locator('.result-meta')).toContainText('合計 00:05');
});

test('連続練習では前問の経過時間を引き継がず各問に制限時間を確保する', async ({ app, page }) => {
  await page.clock.install();
  await app.open({ time: 10, count: 2 });
  await app.startPractice();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now())));
  await page.clock.runFor(10100);
  await expect(page.getByText('2 / 2')).toBeVisible();
  await expect(page.locator('.practice-section')).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('timer')).toContainText('00:10');
  await page.clock.runFor(9000);
  await expect(page.getByText('2 / 2')).toBeVisible();
  await page.clock.runFor(1100);
  await expect(page.locator('.result-meta')).toContainText('合計 00:20');
});

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
