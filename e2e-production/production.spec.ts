import { expect, test } from '@playwright/test';

test('serves the custom Meowfolio cat as a real browser favicon and Apple touch icon', async ({ page, request }) => {
  await page.goto('/');
  const icon = page.locator('head link[rel="icon"]');
  await expect(icon).toHaveAttribute('type', 'image/png');
  await expect(icon).toHaveAttribute('href', '/favicon.png');
  await expect(page.locator('head link[rel="apple-touch-icon"]'))
    .toHaveAttribute('href', '/favicon.png');
  await expect(page.locator('head meta[name="apple-mobile-web-app-title"]'))
    .toHaveAttribute('content', 'Meowfolio');

  const response = await request.get('/favicon.png');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toMatch(/image\/png/i);
  const bytes = await response.body();
  expect(bytes.length).toBeGreaterThan(128);
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);

  const decoded = await page.evaluate(async () => {
    const image = new Image();
    image.src = '/favicon.png';
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  });
  expect(decoded.width).toBeGreaterThanOrEqual(32);
  expect(decoded.height).toBeGreaterThanOrEqual(32);
});

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


test('keyboard navigation exposes main content and supports retro upload controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  expect(await skip.evaluate((node) => node.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page.getByRole('heading', { level: 1, name: /little cats, big memories/i })).toBeVisible();

  const welcome = page.getByRole('button', { name: 'Open camera' });
  await expect(welcome).toHaveJSProperty('tagName', 'BUTTON');
  await welcome.focus();
  const capture = page.waitForEvent('filechooser');
  await welcome.press('Enter');
  expect((await capture).isMultiple()).toBe(false);

  await page.getByRole('button', { name: 'Open my scrapbook' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /meowfolio/i })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Your Meowfolio is empty.' })).toBeVisible();
  const camera = page.getByRole('button', { name: /camera/i }).first();
  const gallery = page.getByRole('button', { name: 'Add photo' });
  await expect(camera).toBeVisible();
  await expect(gallery).toBeVisible();
  expect(await gallery.evaluate((node) => node.tagName)).toBe('BUTTON');
  await gallery.focus();
  const chooser = page.waitForEvent('filechooser');
  await gallery.press('Enter');
  expect((await chooser).isMultiple()).toBe(false);
});

test('pixel scrapbook controls remain usable at 320px and preserve responsive contrast cues', async ({ page }) => {
  for (const width of [320, 390, 760, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const openScrapbook = page.getByRole('button', { name: 'Open my scrapbook' });
    if (await openScrapbook.isVisible()) await openScrapbook.click();
    const metrics = await page.evaluate(() => {
      const profile = Array.from(document.querySelectorAll('.profile-shortcut'))
        .find((node) => node.getBoundingClientRect().height > 0)!;
      const disclosure = document.querySelector('.backup-panel > summary')!;
      const bar = document.querySelector('.pixel-window-title')!;
      const barText = Array.from(bar.querySelectorAll('.pixel-window-hint, .meow-titlebar-mini, .meow-titlebar-full'))
        .find((node) => getComputedStyle(node).display !== 'none')!;
      return {
        overflow: document.documentElement.scrollWidth - innerWidth,
        profileHeight: profile.getBoundingClientRect().height,
        disclosureHeight: disclosure.getBoundingClientRect().height,
        hintFontSize: parseFloat(getComputedStyle(barText).fontSize),
        disclosureSymbol: getComputedStyle(disclosure, '::after').content,
      };
    });
    expect(metrics.overflow).toBeLessThanOrEqual(2);
    expect(metrics.profileHeight).toBeGreaterThanOrEqual(44);
    expect(metrics.disclosureHeight).toBeGreaterThanOrEqual(44);
    expect(metrics.hintFontSize).toBeGreaterThanOrEqual(12);
    expect(metrics.disclosureSymbol).toContain('+');
    const backup = page.locator('.backup-panel > summary');
    await backup.click();
    await expect(page.locator('.backup-panel')).toHaveAttribute('open', '');
    await backup.click();
  }
});

test('invalid local profile names have attached error and return focus to input', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /open my scrapbook/i }).click();
  await page.getByRole('button', { name: /create my local profile/i }).click();
  const name = page.getByLabel('Your display name');
  await name.fill('   ');
  await page.getByRole('button', { name: /save my profile/i }).click();
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  const error = page.locator('#profile-name-error');
  await expect(error).toBeVisible();
  await expect(name).toHaveAttribute('aria-describedby', 'profile-name-error');
});


test('Y2K titlebar links to the creator and shows the real GitHub repository star count', async ({ page }) => {
  let requests = 0;
  await page.route('https://api.github.com/repos/ThunderKhan/meowfolio', async (route) => {
    requests += 1;
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ stargazers_count: 27 }),
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /open my scrapbook/i }).click();

  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(nav.getByRole('button', { name: 'Home' })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Cats' })).toBeVisible();
  const repoLink = nav.getByRole('link', { name: /meowfolio on github, 27 stars/i });
  await expect(repoLink).toBeVisible();
  await expect(repoLink).toContainText('★ 27');
  await expect(repoLink).toHaveAttribute('href', 'https://github.com/ThunderKhan/meowfolio');
  await expect(repoLink).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('link', { name: /thunderkhan/i }))
    .toHaveAttribute('href', 'https://github.com/ThunderKhan');
  expect(requests).toBe(1);

  // A second page visit in the same browser session reuses the 15-minute
  // metadata cache instead of rate-limiting GitHub's public API.
  await page.reload();
  await expect(nav.getByRole('link', { name: /27 stars/i })).toBeVisible();
  expect(requests).toBe(1);
});

test('GitHub rate limit never displays invented zero stars or disables navigation', async ({ page }) => {
  await page.route('https://api.github.com/repos/ThunderKhan/meowfolio', (route) =>
    route.fulfill({ status: 403, contentType: 'application/json', body: '{}' }));
  await page.goto('/');
  await page.getByRole('button', { name: /open my scrapbook/i }).click();
  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  const repo = nav.getByRole('link', { name: /meowfolio source code on github/i });
  await expect(repo).toBeVisible();
  await expect(repo).toContainText('★');
  await expect(repo).not.toContainText('★ 0');
});

test('pixel navbar remains tappable and single-row at 320px through desktop', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /open my scrapbook/i }).click();
  for (const width of [320, 390, 760, 1024, 1728]) {
    await page.setViewportSize({ width, height: 844 });
    const result = await page.locator('.meow-header-titlebar').evaluate((titlebar) => {
      const nav = titlebar.querySelector('.meow-nav')!;
      const controls = Array.from(nav.querySelectorAll<HTMLElement>('button, a'))
        .filter((item) => getComputedStyle(item).display !== 'none');
      const rects = controls.map((node) => node.getBoundingClientRect());
      return {
        verticalClipping: titlebar.scrollHeight > titlebar.clientHeight + 2,
        horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
        heights: rects.map((rect) => rect.height),
        sameRow: rects.every((rect) => Math.abs(rect.top - rects[0].top) <= 1),
        overlaps: rects.some((rect, index) =>
          index > 0 && rect.left < rects[index - 1].right - 1),
        links: controls.length,
      };
    });
    expect(result.links).toBe(width <= 760 ? 3 : 4);
    expect(result.heights.every((height) => height >= 44)).toBe(true);
    expect(result.horizontalOverflow).toBeLessThanOrEqual(2);
    expect(result.sameRow).toBe(true);
    expect(result.overlaps).toBe(false);
    expect(result.verticalClipping).toBe(false);
  }
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
      const camera = controls?.querySelector('.welcome-camera-button');
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


test('production local profile survives reload without any account or model request', async ({ page }) => {
  const modelRequests: string[] = [];
  page.on('request', (request) => {
    if (/huggingface\\.co|cdn-lfs|xethub/.test(request.url())) modelRequests.push(request.url());
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Open my scrapbook/ }).click();
  await page.getByRole('button', { name: /Create my local profile/ }).click();
  await expect(page.getByText(/no online account is created/i)).toBeVisible();
  await page.getByLabel('Your display name').fill('Ayan');
  await page.getByRole('button', { name: 'Save my profile' }).click();
  await expect(page.getByRole('button', { name: /Ayan.*edit my space/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /Ayan.*edit my space/ })).toBeVisible();
  expect(modelRequests).toEqual([]);
});
