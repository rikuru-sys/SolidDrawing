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
  await expect(page.getByRole('checkbox', { name: '立方体 1・光源左上を練習対象に選択' })).toBeVisible();
  await expect(page.getByRole('button', { name: '選択した立体を現在の設定で練習（0件）' })).toBeDisabled();
});

test('お気に入りに保存した向き・比率・光源を現在の設定で再練習できる', async ({ app, page }) => {
  await app.open({ practiceMode: 'sample-only' });
  await app.startPractice();
  await app.finishSampleOnlyPractice();
  await page.getByRole('button', { name: 'お気に入りに追加' }).click();
  await page.getByRole('button', { name: 'トップへ戻る' }).click();
  await page.getByRole('button', { name: 'お気に入り' }).click();

  await page.getByRole('checkbox', { name: '立方体 1・光源左上を練習対象に選択' }).check();
  await page.getByRole('button', { name: '選択した立体を現在の設定で練習（1件）' }).click();

  await expect(page.getByText('1 / 1')).toBeVisible();
  await expect(page.getByText('立方体', { exact: true })).toBeVisible();
});

test('チェックした複数のお気に入りを現在の設定で連続練習できる', async ({ app, page }) => {
  await app.open({ practiceMode: 'sample-only' });
  await page.evaluate(() => {
    const prompt = {
      widthScale: 1,
      heightScale: 1,
      depthScale: 1,
      cameraAzimuth: 0.4,
      cameraElevation: 0.3,
      objectRotationX: 0,
      objectRotationY: 0,
      objectRotationZ: 0,
      lightDirection: 'top-left',
    };
    localStorage.setItem('solid-drawing-favorites', JSON.stringify({
      schemaVersion: 3,
      items: [
        { prompt: { ...prompt, id: 'favorite-cube', shape: '立方体' } },
        { prompt: { ...prompt, id: 'favorite-cylinder', shape: '円柱', objectRotationY: 0.8 } },
      ],
    }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'お気に入り' }).click();

  await page.getByRole('checkbox', { name: '立方体 1・光源左上を練習対象に選択' }).check();
  await page.getByRole('checkbox', { name: '円柱 1・光源左上を練習対象に選択' }).check();
  await page.getByRole('button', { name: '選択した立体を現在の設定で練習（2件）' }).click();

  await expect(page.getByText('1 / 2')).toBeVisible();
  await expect(page.getByText('立方体', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '次の見本へ' }).click();
  await expect(page.getByText('2 / 2')).toBeVisible();
  await expect(page.getByText('円柱', { exact: true })).toBeVisible();
});

test('お気に入りを確認してから削除する', async ({ app, page }) => {
  await app.open({ practiceMode: 'sample-only' });
  await app.startPractice();
  await app.finishSampleOnlyPractice();
  await page.getByRole('button', { name: 'お気に入りに追加' }).click();
  await page.getByRole('button', { name: 'トップへ戻る' }).click();
  await page.getByRole('button', { name: 'お気に入り' }).click();

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toBe('立方体 1・光源左上をお気に入りから削除しますか？');
    await dialog.accept();
  });
  await page.getByRole('button', { name: '立方体 1・光源左上を削除' }).click();

  await expect(page.getByText('お気に入りはまだありません')).toBeVisible();
});
