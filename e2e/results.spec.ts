import { expect, test } from './fixtures/app-fixture';

test('結果画面で横並びと重ね合わせを切り替えられる', async ({ app, page }) => {
  await app.open();
  await app.startPractice();
  await app.drawLine();
  await app.finishCanvasPractice();

  const sideBySide = page.getByRole('button', { name: '横並び' });
  const overlay = page.getByRole('button', { name: '重ね合わせ', exact: true });
  await expect(sideBySide).toHaveAttribute('aria-pressed', 'true');
  await overlay.click();
  await expect(overlay).toHaveAttribute('aria-pressed', 'true');

  const opacity = page.getByLabel('重ね合わせる描画の濃さ');
  await opacity.fill('0.5');
  await expect(opacity).toHaveValue('0.5');
  await expect(page.getByAltText('立方体を描いた結果の重ね合わせ'))
    .toHaveCSS('opacity', '0.5');
});

test('通常練習では形状評価を表示し、影項目は表示しない', async ({ app, page }) => {
  await app.open();
  await app.startPractice();
  await app.drawLine();
  await app.finishCanvasPractice();

  await expect(page.getByText('自動形状評価', { exact: true })).toBeVisible();
  await expect(page.locator('.evaluation-metrics dt', { hasText: '影' })).toHaveCount(0);
});

test('影モードでは形状・影評価と影項目を表示する', async ({ app, page }) => {
  await app.open({ sampleStyle: 'shadow' });
  await app.startPractice();
  await app.drawLine();
  await page.getByRole('button', { name: '影', exact: true }).click();
  await app.drawLine();
  await app.finishCanvasPractice();

  await expect(page.getByText('自動形状・影評価', { exact: true })).toBeVisible();
  await expect(page.locator('.evaluation-metrics dt', { hasText: '影' })).toBeVisible();
});

test('複数の結果を前後に移動できる', async ({ app, page }) => {
  await app.open({ count: 2 });
  await app.startPractice();
  await app.drawLine();
  await page.getByRole('button', { name: '保存して次へ' }).click();
  await expect(page.getByText('2 / 2')).toBeVisible();
  await app.drawLine();
  await app.finishCanvasPractice();

  await expect(page.getByRole('heading', { name: '2　立方体' })).toBeVisible();
  await expect(page.getByRole('button', { name: '次へ' })).toBeDisabled();
  await page.getByRole('button', { name: '前へ' }).click();
  await expect(page.getByRole('heading', { name: '1　立方体' })).toBeVisible();
  await expect(page.getByRole('button', { name: '次へ' })).toBeEnabled();
});

test('今回と同じ立体でもう一度練習できる', async ({ app, page }) => {
  await app.open();
  await app.startPractice();
  await app.drawLine();
  await app.finishCanvasPractice();

  await page.getByRole('button', { name: '今回と同じ立体でもう一度' }).click();
  await expect(page.getByText('1 / 1')).toBeVisible();
  await expect(page.getByText('立方体', { exact: true })).toBeVisible();
});

test('同じ設定でもう一度練習できる', async ({ app, page }) => {
  await app.open({ count: 2 });
  await app.startPractice();
  await app.drawLine();
  await page.getByRole('button', { name: '保存して次へ' }).click();
  await app.drawLine();
  await app.finishCanvasPractice();

  await page.getByRole('button', { name: '同じ設定でもう一度' }).click();
  await expect(page.getByText('1 / 2')).toBeVisible();
});
