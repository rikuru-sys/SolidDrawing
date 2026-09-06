import { expect, type Locator, type Page } from '@playwright/test';

export async function expectNoHorizontalScroll(page: Page, viewportWidth: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(viewportWidth);
}

export async function expectNoVerticalScroll(page: Page, viewportHeight: number) {
  expect(await page.evaluate(() => document.documentElement.scrollHeight))
    .toBeLessThanOrEqual(viewportHeight);
}

export async function imageContentMargins(imageLocator: Locator) {
  return imageLocator.evaluate((element) => {
    const image = element as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let top = canvas.height;
    let bottom = -1;

    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const index = (y * canvas.width + x) * 4;
        const isVisibleLine = pixels[index + 3] > 0
          && (pixels[index] < 235 || pixels[index + 1] < 235 || pixels[index + 2] < 235);
        if (!isVisibleLine) continue;
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }

    return { top, bottom, height: canvas.height };
  });
}
