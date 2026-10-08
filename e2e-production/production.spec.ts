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
  await expect(page.getByRole('button', { name: 'Find cat' })).toBeEnabled();
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
      const addPhoto = controls?.querySelector('.home-mobile-gallery');
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


test('phone photo actions share one row and a photo can be saved locally without AI', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /open my scrapbook/i }).click();

  // The mobile home photo shortcut skips the redundant empty preview.
  const imageBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#d9a7c2';
    ctx.fillRect(0, 0, 160, 120);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#home-gallery').setInputFiles({
    name: 'captured-cat.png',
    mimeType: 'image/png',
    buffer: Buffer.from(imageBase64, 'base64'),
  });
  await expect(page.getByRole('img', { name: 'Cat encounter preview' })).toBeVisible();

  const controls = page.locator('.scan-capture-actions button');
  await expect(controls).toHaveCount(3);
  const rectangles = await controls.evaluateAll((nodes) =>
    nodes.map((node) => {
      const r = node.getBoundingClientRect();
      return { top: r.top, left: r.left, right: r.right };
    }),
  );
  expect(rectangles[0].top).toBe(rectangles[1].top);
  expect(rectangles[1].top).toBe(rectangles[2].top);
  expect(rectangles[0].right).toBeLessThan(rectangles[1].left);
  expect(rectangles[1].right).toBeLessThan(rectangles[2].left);
  await expect(page.getByRole('button', { name: 'Find cat' })).toBeEnabled();

  await page.getByRole('button', { name: /save photo for later/i }).click();
  await expect(page.getByRole('heading', { name: /saved for later/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /your meowfolio is empty/i })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: /saved for later/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Process photo' })).toBeVisible();
  await page.getByRole('button', { name: 'Process photo' }).click();
  await expect(page.getByRole('img', { name: 'Cat encounter preview' })).toBeVisible();
});

test('mobile scan action labels are large and a save-later button exists before model consent', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 730 });
  await page.goto('/');
  await page.getByRole('button', { name: /open my scrapbook/i }).click();
  await page.locator('#home-gallery').setInputFiles({
    name: 'portrait.png',
    mimeType: 'image/png',
    buffer: await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      canvas.getContext('2d')!.fillRect(0, 0, 64, 64);
      return [...new Uint8Array(await (await fetch(canvas.toDataURL())).arrayBuffer())];
    }).then((values) => Buffer.from(values)),
  });
  await expect(page.getByRole('button', { name: 'Find cat' })).toBeEnabled();
  const size = await page.locator('.scan-capture-actions button').first().evaluate((node) =>
    Number.parseFloat(getComputedStyle(node).fontSize),
  );
  expect(size).toBeGreaterThanOrEqual(14);
  const horizontalScroll = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalScroll).toBeLessThanOrEqual(2);
});


test('version 1 scrapbook survives a temporarily blocked version 2 storage upgrade', async ({ page, context }) => {
  const oldTab = await context.newPage();
  await oldTab.route('**/legacy-db-holder', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Old tab</title>' }),
  );
  await oldTab.goto('/legacy-db-holder');
  // Emulate an old production tab holding a v1 connection open while the
  // updated release starts a v2 migration. No app code is allowed to clear
  // or overwrite the original cats store.
  await oldTab.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const opening = indexedDB.open('meowfolio', 1);
      opening.onupgradeneeded = () => {
        const db = opening.result;
        db.createObjectStore('cats', { keyPath: 'id' });
        const encounters = db.createObjectStore('encounters', { keyPath: 'id' });
        encounters.createIndex('catId', 'catId', { unique: false });
        encounters.createIndex('catId_timestamp', ['catId', 'timestamp'], { unique: false });
      };
      opening.onerror = () => reject(opening.error);
      opening.onsuccess = () => {
        const db = opening.result;
        (window as Window & { heldOldDb?: IDBDatabase }).heldOldDb = db;
        const tx = db.transaction('cats', 'readwrite');
        tx.objectStore('cats').put({
          id: 'legacy-cat',
          name: 'Previous saved cat',
          createdAt: 1,
          updatedAt: 1,
          firstSeenAt: 1,
          lastSeenAt: 1,
          encounterCount: 1,
          coverEncounterId: 'not-used',
          referenceEmbeddingSum: new Float64Array(384),
          referenceEmbedding: new Float32Array(384),
          referenceEmbeddingCount: 1,
          embeddingSpace: {
            modelId: 'legacy', revision: 'old', dtype: 'uint8',
            preprocessingVersion: 1, dimension: 384, pooling: 'cls-token',
          },
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /open my scrapbook/i }).click();
  // Release the blocked upgrade after the new app has started. The database
  // open should continue automatically without poisoning subsequent saves.
  await oldTab.waitForTimeout(350);
  await oldTab.evaluate(() => {
    (window as Window & { heldOldDb?: IDBDatabase }).heldOldDb?.close();
  });
  await expect(page.locator('.empty-scrapbook-panel')).toBeVisible({ timeout: 12_000 });
  const record = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open('meowfolio', 2);
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
    });
    const result = await new Promise<{ marker: boolean; pendingStore: boolean }>((resolve, reject) => {
      const pendingStore = db.objectStoreNames.contains('pendingPhotos');
      const lookup = db.transaction('cats', 'readonly').objectStore('cats').get('legacy-cat');
      lookup.onsuccess = () => resolve({ marker: lookup.result?.name === 'Previous saved cat', pendingStore });
      lookup.onerror = () => reject(lookup.error);
    });
    db.close();
    return result;
  });
  expect(record).toEqual({ marker: true, pendingStore: true });
  await oldTab.close();
});
