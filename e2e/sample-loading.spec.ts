import { expect, test } from './fixtures/app-fixture';

test('見本の読み込みに失敗した場合は時間切れや終了操作で空の結果を保存しない', async ({ app, page }) => {
  await page.clock.install();
  await page.route('**/three-sample-*.js', route => route.abort());
  await app.open({ time: 10 });
  await app.startPractice(false);
  await expect(page.getByRole('alert')).toContainText('3D見本を表示できませんでした');
  await page.clock.runFor(20100);
  await expect(page.getByRole('timer')).toContainText('00:10');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '終了', exact: true }).click();
  await expect(page.getByRole('heading', { name: '練習結果' })).toHaveCount(0);
  await expect(page.getByText('1 / 1')).toBeVisible();
});

test('見本が未準備の間は時間制限なしでも手動保存を無効にする', async ({ app, page }) => {
  await page.route('**/three-sample-*.js', route => route.abort());
  await app.open();
  await app.startPractice(false);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: '保存して次へ' })).toBeDisabled();
});

test('見本の描画失敗から再試行で復旧すると制限時間を最初から使える', async ({ app, page }) => {
  await page.clock.install();
  await app.open({ time: 10, sampleStyle: 'shadow' });
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (args[0].includes('webgl')) throw new Error('再試行確認用の描画エラー');
      return original.apply(this, args);
    } as typeof original;
    Object.assign(window, { restoreCanvasContext: () => { HTMLCanvasElement.prototype.getContext = original; } });
  });
  await app.startPractice(false);
  await expect(page.getByRole('alert')).toBeVisible();
  await page.clock.runFor(15100);
  await expect(page.getByRole('timer')).toContainText('00:10');
  await page.evaluate(() => (window as unknown as { restoreCanvasContext: () => void }).restoreCanvasContext());
  await page.getByRole('button', { name: '再試行する' }).click();
  await expect(page.locator('.practice-section')).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.clock.runFor(9000);
  await expect(page.getByText('1 / 1')).toBeVisible();
  await page.clock.runFor(1100);
  await expect(page.getByRole('heading', { name: '練習結果' })).toBeVisible();
});
