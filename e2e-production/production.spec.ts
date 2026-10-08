import { expect, test } from '@playwright/test';

test('production ignores development-only query flags and renders the real pixel scrapbook', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (/huggingface\.co|cdn-lfs|xethub|onnx/i.test(url)) requests.push(url);
  });

  await page.goto('/?matchingLab=1&skipWelcome=1&mockAi=single&catalog=familiar');
  await expect(page.getByRole('button', { name: /open my scrapbook/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /familiar-face matching lab/i })).toHaveCount(0);
  await page.getByRole('button', { name: /open my scrapbook/i }).click();
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
  await page.getByRole('button', { name: /open my scrapbook/i }).click();
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


test('welcome fits a phone viewport and puts camera action above the fold', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /little cats, big memories/i })).toBeVisible();
  await expect(page.getByText('your next memory is one tap away!')).toBeVisible();
  await expect(page.getByText('How privacy and AI work')).toHaveCount(0);
  await expect(page.locator('.welcome-art')).toBeHidden();

  const metrics = await page.evaluate(() => {
    const camera = document.querySelector('.welcome-camera-button');
    if (!camera) throw new Error('Missing camera action');
    const rect = camera.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      viewport: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });

  expect(metrics.bottom).toBeLessThan(metrics.viewport - 48);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 3);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 3);
});

test('quick camera capture opens the real scan preview without downloading models', async ({ page }) => {
  const modelRequests: string[] = [];
  page.on('request', (request) => {
    if (/huggingface\\.co|cdn-lfs|xethub/i.test(request.url())) modelRequests.push(request.url());
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const pngBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff95d5';
    ctx.fillRect(0, 0, 96, 96);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#welcome-camera').setInputFiles({
    name: 'outdoor-cat.png',
    mimeType: 'image/png',
    buffer: Buffer.from(pngBase64, 'base64'),
  });

  await expect(page.getByRole('heading', { name: /add this meeting to your scrapbook/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Find the cat' })).toBeEnabled();
  await expect(page.getByRole('img', { name: 'Cat encounter preview' })).toBeVisible();
  expect(modelRequests).toEqual([]);
});
