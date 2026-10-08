import { expect, test } from '@playwright/test';

test('production ignores development-only query flags and renders the real pixel scrapbook', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (/huggingface\.co|cdn-lfs|xethub|onnx/i.test(url)) requests.push(url);
  });

  await page.goto('/?matchingLab=1&skipWelcome=1&mockAi=single&catalog=familiar');
  await expect(page.getByRole('button', { name: /start my meowfolio/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /familiar-face matching lab/i })).toHaveCount(0);
  await page.getByRole('button', { name: /start my meowfolio/i }).click();
  await expect(page.getByRole('heading', { name: /your meowfolio is empty/i })).toBeVisible();

  const color = await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(color).toBe('rgb(255, 215, 236)');
  expect(requests).toEqual([]);

  await page.reload();
  await expect(page.getByRole('heading', { name: /your meowfolio is empty/i })).toBeVisible();
  expect(requests).toEqual([]);
});

test('ordinary production scan requires consent before model download', async ({ page }) => {
  const modelRequests: string[] = [];
  page.on('request', (request) => {
    if (/huggingface\.co|cdn-lfs|xethub/i.test(request.url())) {
      modelRequests.push(request.url());
    }
  });
  await page.goto('/');
  await page.getByRole('button', { name: /start my meowfolio/i }).click();
  await page.getByRole('button', { name: /spot a cat/i }).first().click();
  // Generate the fixture in Chromium itself so the image is definitely
  // decodable by the same createImageBitmap path that the app uses.
  const pngBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable in production smoke.');
    context.fillStyle = '#ffbadc';
    context.fillRect(0, 0, 64, 64);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#cat-photo').setInputFiles({
    name: 'generated.png',
    mimeType: 'image/png',
    buffer: Buffer.from(pngBase64, 'base64'),
  });
  await expect(page.getByRole('button', { name: 'Find the cat' })).toBeEnabled();
  await page.getByRole('button', { name: 'Find the cat' }).click();
  await expect(page.getByRole('button', { name: 'Download models & continue' }))
    .toBeVisible({ timeout: 45_000 });
  expect(modelRequests).toEqual([]);
});
