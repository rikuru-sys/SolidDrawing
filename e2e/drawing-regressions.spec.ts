import { expect, test } from './fixtures/app-fixture';

for (const { label, eraserX, erased } of [
  { label: '線の横を消しても残っている線を評価できる', eraserX: 0.52, erased: false },
  { label: '線を直接消すと評価対象からも消える', eraserX: 0.5, erased: true },
]) {
  test(label, async ({ app, page }) => {
    await app.open();
    await app.startPractice();
    const canvas = page.getByLabel('描画キャンバス');
    const bounds = (await canvas.boundingBox())!;
    async function drawVerticalLine(x: number) {
      await page.mouse.move(bounds.x + bounds.width * x, bounds.y + bounds.height * 0.2);
      await page.mouse.down();
      await page.mouse.move(bounds.x + bounds.width * x, bounds.y + bounds.height * 0.8, { steps: 10 });
      await page.mouse.up();
    }
    async function visiblePixels() {
      return canvas.evaluate((element: HTMLCanvasElement) => {
        const pixels = element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data;
        let count = 0;
        for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 24) count++;
        return count;
      });
    }
    await drawVerticalLine(0.5);
    const before = await visiblePixels();
    expect(before).toBeGreaterThan(0);
    await page.getByRole('button', { name: '消しゴム', exact: true }).click();
    await drawVerticalLine(eraserX);
    expect(await visiblePixels()).toBe(erased ? 0 : before);
    await app.finishCanvasPractice();
    const emptyFeedback = page.getByText('評価できる主線が少ないため、ペンで輪郭をもう少し描いてみましょう。');
    if (erased) await expect(emptyFeedback).toBeVisible();
    else await expect(emptyFeedback).toHaveCount(0);
  });
}

test('描画中に別の指で触れて離しても最初の指の線だけを保存する', async ({ app, page }) => {
  await app.open();
  await app.startPractice();
  const bounds = (await page.getByLabel('描画キャンバス').boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const first = { x: bounds.x + bounds.width * 0.25, y: bounds.y + bounds.height * 0.3, id: 1 };
  const second = { x: bounds.x + bounds.width * 0.7, y: bounds.y + bounds.height * 0.7, id: 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
  first.y = bounds.y + bounds.height * 0.5;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [first] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, second] });
  second.x += 20;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [first, second] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [second] });
  first.y = bounds.y + bounds.height * 0.6;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [first] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await app.finishCanvasPractice();
  const paths = await page.getByAltText('立方体を描いた結果', { exact: true }).evaluate((image: HTMLImageElement) => {
    const svg = decodeURIComponent(image.src.slice(image.src.indexOf(',') + 1));
    return Array.from(new DOMParser().parseFromString(svg, 'image/svg+xml').querySelectorAll('path'))
      .map(path => path.getAttribute('d')!);
  });
  expect(paths).toHaveLength(1);
  const coordinates = paths[0].match(/[\d.]+/g)!.map(Number);
  for (let index = 0; index < coordinates.length; index += 2) {
    expect(coordinates[index]).toBeCloseTo(bounds.width * 0.25, 1);
  }
  expect(coordinates[1]).toBeCloseTo(bounds.height * 0.3, 1);
  expect(coordinates.at(-1)).toBeCloseTo(bounds.height * 0.6, 1);
});
