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


test('mobile scrapbook presents adjacent capture actions and compact empty state', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const enter = page.getByRole('button', { name: /open my scrapbook/i });
    if (await enter.isVisible()) await enter.click();
    await expect(page.locator('.empty-scrapbook-panel')).toBeVisible();

    const layout = await page.evaluate(() => {
      const controls = document.querySelector('.home-capture-actions');
      const camera = controls?.querySelector('label');
      const addPhoto = controls?.querySelector('button');
      const empty = document.querySelector('.empty-scrapbook-panel');
      if (!controls || !camera || !addPhoto || !empty) throw new Error('Missing mobile home UI');
      const cam = camera.getBoundingClientRect();
      const add = addPhoto.getBoundingClientRect();
      const panel = empty.getBoundingClientRect();
      return {
        camTop: cam.top,
        addTop: add.top,
        camRight: cam.right,
        addLeft: add.left,
        panelBottom: panel.bottom,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        duplicateCtaHidden: getComputedStyle(document.querySelector('.empty-scrapbook-cta')!).display === 'none',
        mobileBrandVisible: getComputedStyle(document.querySelector('.home-mobile-brand')!).display !== 'none',
        desktopBrandHidden: getComputedStyle(document.querySelector('.home-desktop-brand')!).display === 'none',
      };
    });

    expect(Math.abs(layout.camTop - layout.addTop)).toBeLessThanOrEqual(2);
    expect(layout.camRight).toBeLessThan(layout.addLeft);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 2);
    expect(layout.scrollHeight).toBeLessThanOrEqual(layout.viewportHeight + 2);
    expect(layout.panelBottom).toBeLessThan(layout.viewportHeight - 28);
    expect(layout.duplicateCtaHidden).toBe(true);
    expect(layout.mobileBrandVisible).toBe(true);
    expect(layout.desktopBrandHidden).toBe(true);
  }
});

test('desktop scrapbook retains its original header and empty-state action', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: /open my scrapbook/i }).click();
  await expect(page.getByText('meowfolio // local save file')).toBeVisible();
  await expect(page.getByText('personal neighborhood cat scrapbook')).toBeVisible();
  await expect(page.getByRole('button', { name: /spot a cat/i }).first()).toBeVisible();
  await expect(page.locator('.empty-scrapbook-cta')).toBeVisible();
  await expect(page.locator('.home-mobile-brand')).toBeHidden();
});

test('processing spinner actually rotates and respects reduced motion', async ({ page }) => {
  await page.goto('/');
  const normal = await page.evaluate(() => {
    const element = document.createElement('div');
    element.className = 'meow-spinner';
    document.body.append(element);
    const computed = getComputedStyle(element);
    const result = {
      name: computed.animationName,
      duration: computed.animationDuration,
      border: computed.borderTopColor,
    };
    element.remove();
    return result;
  });
  expect(normal.name).toBe('meow-spin');
  expect(normal.duration).toBe('0.85s');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await page.evaluate(() => {
    const element = document.createElement('div');
    element.className = 'meow-spinner';
    document.body.append(element);
    const value = getComputedStyle(element).animationName;
    element.remove();
    return value;
  });
  expect(reduced).toBe('none');
});
