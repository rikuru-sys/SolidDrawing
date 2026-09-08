import { expect, test } from './fixtures/app-fixture';

test('結果をお気に入りへ追加して確認できる', async ({ app, page }) => {
  await app.open({ practiceMode: 'sample-only' });
  await app.startPractice();
  await app.finishSampleOnlyPractice();

  await page.getByRole('button', { name: 'お気に入りに追加' }).click();
  await expect(page.getByRole('button', { name: 'お気に入り済み' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const stored = localStorage.getItem('solid-drawing-favorites');
    return stored ? JSON.parse(stored) : null;
  })).toMatchObject({
    schemaVersion: 3,
    items: [{
      prompt: {
        shape: '立方体',
        lightDirection: 'top-left',
      },
    }],
  });
  const storedFavorite = await page.evaluate(() => {
    const stored = localStorage.getItem('solid-drawing-favorites');
    return stored ? JSON.parse(stored).items[0] : null;
  });
  expect(Object.keys(storedFavorite)).toEqual(['prompt']);
  expect(storedFavorite.prompt).toEqual(expect.objectContaining({
    widthScale: expect.any(Number),
    heightScale: expect.any(Number),
    depthScale: expect.any(Number),
    cameraAzimuth: expect.any(Number),
    cameraElevation: expect.any(Number),
    objectRotationX: expect.any(Number),
    objectRotationY: expect.any(Number),
    objectRotationZ: expect.any(Number),
  }));
  await page.getByRole('button', { name: 'トップへ戻る' }).click();
  await page.getByRole('button', { name: 'お気に入り' }).click();

  await expect(page.getByRole('heading', { name: 'お気に入り' })).toBeVisible();
  await expect(page.getByRole('button', { name: /立方体/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'この立体を現在の設定で練習' })).toBeVisible();
});

test('お気に入りに保存した向き・比率・光源を現在の設定で再練習できる', async ({ app, page }) => {
  await app.open({ practiceMode: 'sample-only' });
  await app.startPractice();
  await app.finishSampleOnlyPractice();
  await page.getByRole('button', { name: 'お気に入りに追加' }).click();
  await page.getByRole('button', { name: 'トップへ戻る' }).click();
  await page.getByRole('button', { name: 'お気に入り' }).click();

  await page.getByRole('button', { name: 'この立体を現在の設定で練習' }).click();

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
    expect(dialog.message()).toBe('選択中の立体をお気に入りから削除しますか？');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'お気に入りから削除' }).click();

  await expect(page.getByText('お気に入りはまだありません')).toBeVisible();
});
