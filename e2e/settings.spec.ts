import { expect, test } from './fixtures/app-fixture';

test('設定画面の描画ツールを同じ高さで表示する', async ({ app, page }) => {
  await app.open();
  await page.getByRole('button', { name: '設定する' }).click();

  const countBox = await page.getByLabel('練習回数').boundingBox();
  const penWidthBox = await page.getByLabel('線の太さ').boundingBox();
  const penColorBox = await page.locator('.color-setting').boundingBox();
  const penOpacityBox = await page.locator('.opacity-setting').boundingBox();

  expect(countBox).not.toBeNull();
  expect(penWidthBox).not.toBeNull();
  expect(penColorBox).not.toBeNull();
  expect(penOpacityBox).not.toBeNull();
  expect(penWidthBox?.height).toBeCloseTo(countBox?.height ?? 0, 0);
  expect(penColorBox?.height).toBeCloseTo(countBox?.height ?? 0, 0);
  expect(penOpacityBox?.height).toBeCloseTo(countBox?.height ?? 0, 0);
});

test('変更した設定を練習画面へ反映する', async ({ app, page }) => {
  await app.open();
  await page.getByRole('button', { name: '設定する' }).click();

  await page.getByLabel('練習回数').fill('2');
  await page.getByLabel('線の太さ').selectOption('5');
  await page.getByRole('button', { name: /^難しい/ }).click();
  await page.getByRole('button', { name: '輪郭線と影', exact: true }).click();
  await page.getByRole('button', { name: '見本が右', exact: true }).click();
  await page.getByRole('button', { name: 'この設定で始める' }).click();

  await expect(page.getByText('1 / 2')).toBeVisible();
  await expect(page.locator('.workspace-layout')).toHaveClass(/layout-right/);
  await expect(page.getByRole('button', { name: '影', exact: true })).toBeVisible();
  await expect(page.getByLabel('練習中のペンの太さ')).toHaveValue('5');
  await expect(page.getByText(/難しい・光源/)).toBeVisible();
});

test('変更した設定を再読み込み後も保持する', async ({ app, page }) => {
  await app.open();
  await page.getByRole('button', { name: '設定する' }).click();

  await page.getByLabel('練習回数').fill('4');
  await page.getByLabel('線の太さ').selectOption('2');
  await page.getByLabel('手振れ補正').selectOption('medium');
  await page.reload();

  await page.getByRole('button', { name: '設定する' }).click();
  await expect(page.getByLabel('練習回数')).toHaveValue('4');
  await expect(page.getByLabel('線の太さ')).toHaveValue('2');
  await expect(page.getByLabel('手振れ補正')).toHaveValue('medium');
});
