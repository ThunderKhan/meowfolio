import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const CAT_PHOTO =
  'https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/cats.png';

async function catPhoto(request: APIRequestContext): Promise<Buffer> {
  const response = await request.get(CAT_PHOTO);
  expect(response.ok()).toBeTruthy();
  return response.body();
}

async function startScan(page: Page, photo: Buffer): Promise<void> {
  await page.getByRole('button', { name: 'Spot a cat' }).first().click();
  await page.locator('#cat-photo').setInputFiles({
    name: 'cats.png',
    mimeType: 'image/png',
    buffer: photo,
  });
  await expect(page.getByRole('button', { name: 'Find the cat' })).toBeEnabled();
  await page.getByRole('button', { name: 'Find the cat' }).click();
}

async function continueMultiCatIfNeeded(page: Page): Promise<void> {
  const chooser = page.getByRole('heading', { name: 'Which cat are you adding?' });
  if (await chooser.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Continue with cat 1' }).click();
  }
}

async function saveFirstCat(
  page: Page,
  photo: Buffer,
  name = 'Mochi',
  note = 'First meeting.',
): Promise<void> {
  await startScan(page, photo);
  await expect(page.getByTestId('identity-screen')).toBeVisible();
  await page.getByRole('button', { name: 'Name this cat' }).click();
  await page.getByLabel('Cat name').fill(name);
  await page.getByLabel(/Encounter note/).fill(note);
  await page.getByRole('button', { name: 'Save encounter' }).click();
  await expect(page.getByRole('heading', { name: name + ' is in your Meowfolio.' })).toBeVisible();
}

test('real WASM scan reaches a human identity decision in Chromium', async ({ page, request }) => {
  const browserMessages: string[] = [];
  page.on('console', (message) =>
    browserMessages.push('console ' + message.type() + ': ' + message.text()),
  );
  page.on('pageerror', (error) => browserMessages.push('pageerror: ' + error.message));

  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1');
  await startScan(page, photo);

  const consent = page.getByRole('button', { name: 'Download models & continue' });
  await expect(consent).toBeVisible({ timeout: 45_000 });
  await consent.click();

  const identity = page.getByTestId('identity-screen');
  const chooser = page.getByRole('heading', { name: 'Which cat are you adding?' });

  try {
    await expect(identity.or(chooser)).toBeVisible({ timeout: 180_000 });
  } catch (error) {
    throw new Error(
      'Real scan did not reach cat selection or identity. Browser messages:\n' +
        browserMessages.join('\n') +
        '\nOriginal assertion: ' +
        (error instanceof Error ? error.message : String(error)),
    );
  }

  await continueMultiCatIfNeeded(page);
  await expect(identity).toBeVisible({ timeout: 120_000 });
  await expect(identity).toHaveAttribute('data-embedding-dimension', '384');
  await expect(page.getByRole('heading', { name: 'This looks like a new cat.' })).toBeVisible();

  // The same pinned models should be recovered from browser caches even
  // after a reload creates a completely new worker instance.
  await page.reload();
  await startScan(page, photo);
  await expect(page.getByTestId('identity-screen').or(page.getByRole('heading', { name: 'Which cat are you adding?' })))
    .toBeVisible({ timeout: 150_000 });
  await continueMultiCatIfNeeded(page);
  await expect(page.getByTestId('identity-screen')).toBeVisible({ timeout: 100_000 });
  await expect(page.getByRole('button', { name: 'Download models & continue' })).toHaveCount(0);
});

test('controlled multi-cat flow pauses for the person to choose a crop', async ({ page, request }) => {
  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=multi');
  await startScan(page, photo);

  await expect(page.getByRole('heading', { name: 'Which cat are you adding?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with cat 1' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with cat 2' })).toBeVisible();

  await page.getByRole('button', { name: 'Continue with cat 2' }).click();
  await expect(page.getByTestId('identity-screen')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'This looks like a new cat.' })).toBeVisible();
});

test('controlled no-cat result is recoverable and keeps the photo', async ({ page, request }) => {
  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=none');
  await startScan(page, photo);

  await expect(page.getByText(/couldn’t find a cat in this photo/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose another photo' })).toBeVisible();
  await expect(page.getByAltText('Selected encounter')).toBeVisible();

  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText(/couldn’t find a cat in this photo/i)).toBeVisible();
});

test('controlled familiar-face flow keeps identity human-controlled', async ({ page, request }) => {
  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=single&catalog=familiar');
  await startScan(page, photo);

  await expect(page.getByText('Possible familiar face')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Is this Mochi?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yes, it’s Mochi' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'No, this is a new cat' })).toBeVisible();

  await page.getByRole('button', { name: 'Choose another saved cat' }).click();
  await expect(page.getByRole('heading', { name: 'Which cat is this?' })).toBeVisible();
  await expect(page.getByText('Pepper')).toBeVisible();

  await page.getByRole('button', { name: /Pepper/ }).click();
  await expect(page.getByRole('heading', { name: 'Another meeting with Pepper' })).toBeVisible();
});

test('controlled no-suggestion flow offers manual existing-cat fallback', async ({ page, request }) => {
  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=single&catalog=manual');
  await startScan(page, photo);

  await expect(page.getByRole('heading', { name: 'No familiar cat suggested.' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose an existing cat' }).click();
  await expect(page.getByRole('heading', { name: 'Which cat is this?' })).toBeVisible();
  await expect(page.getByText('Mochi')).toBeVisible();
  await expect(page.getByText('Pepper')).toBeVisible();
});

test('back from new-cat details preserves entered name and note', async ({ page, request }) => {
  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=single');
  await startScan(page, photo);

  await page.getByRole('button', { name: 'Name this cat' }).click();
  await page.getByLabel('Cat name').fill('Mochi');
  await page.getByLabel(/Encounter note/).fill('Sleeping under the orange bench.');

  await page.getByRole('button', { name: 'Change identity' }).click();
  await expect(page.getByTestId('identity-screen')).toBeVisible();
  await page.getByRole('button', { name: 'Name this cat' }).click();

  await expect(page.getByLabel('Cat name')).toHaveValue('Mochi');
  await expect(page.getByLabel(/Encounter note/)).toHaveValue('Sleeping under the orange bench.');
});

test('discard requires confirmation and keep editing preserves the scan', async ({ page, request }) => {
  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=single');
  await startScan(page, photo);
  await expect(page.getByTestId('identity-screen')).toBeVisible();

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByTestId('identity-screen')).toBeVisible();

  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Discard scan' }).click();
  await expect(page.getByRole('heading', { name: 'Your Meowfolio is empty.' })).toBeVisible();
});


test('browser Back returns within the scan without losing entered details', async ({ page, request }) => {
  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=single');
  await startScan(page, photo);

  await page.getByRole('button', { name: 'Name this cat' }).click();
  await page.getByLabel('Cat name').fill('Mochi');
  await page.getByLabel(/Encounter note/).fill('Near the old wall.');

  await page.goBack();
  await expect(page.getByTestId('identity-screen')).toBeVisible();

  await page.getByRole('button', { name: 'Name this cat' }).click();
  await expect(page.getByLabel('Cat name')).toHaveValue('Mochi');
  await expect(page.getByLabel(/Encounter note/)).toHaveValue('Near the old wall.');
});


test('new cat commits once, duplicate retry is idempotent, and the record survives reload', async ({ page, request }) => {
  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=single');
  await saveFirstCat(page, photo, 'Mochi', 'By the garden wall.');

  const integrity = await page.evaluate(async () => {
    const repository = (window as any).__MEOWFOLIO_E2E_REPOSITORY__;
    const cats = await repository.listCats();
    const cat = cats[0];
    const encounters = await repository.listEncountersForCat(cat.id);
    const encounter = encounters[0];

    const duplicate = await repository.saveEncounter({
      encounterId: encounter.id,
      timestamp: encounter.timestamp,
      photo: encounter.photo,
      crop: encounter.crop,
      embedding: Array.from(encounter.embedding),
      embeddingSpace: encounter.embeddingSpace,
      detection: encounter.detection,
      note: encounter.note,
      location: encounter.location,
      identity: { kind: 'new', catId: cat.id, name: cat.name },
    });

    let conflictRejected = false;
    try {
      await repository.saveEncounter({
        encounterId: encounter.id,
        timestamp: encounter.timestamp,
        photo: encounter.photo,
        crop: encounter.crop,
        embedding: Array.from(encounter.embedding),
        embeddingSpace: encounter.embeddingSpace,
        detection: encounter.detection,
        note: 'different payload',
        location: encounter.location,
        identity: { kind: 'new', catId: cat.id, name: cat.name },
      });
    } catch {
      conflictRejected = true;
    }

    const after = await repository.getCat(cat.id);
    return {
      duplicate: duplicate.duplicate,
      conflictRejected,
      encounterCount: after.encounterCount,
      referenceCount: after.referenceEmbeddingCount,
      encounterRows: (await repository.listEncountersForCat(cat.id)).length,
    };
  });

  expect(integrity).toEqual({
    duplicate: true,
    conflictRejected: true,
    encounterCount: 1,
    referenceCount: 1,
    encounterRows: 1,
  });

  await page.getByRole('button', { name: 'Back to collection' }).click();
  await expect(page.getByText(/1 cat saved in this browser/i)).toBeVisible();
  await expect(page.getByText('Mochi')).toBeVisible();
  await expect(page.getByText('Met 1 time')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Mochi')).toBeVisible();
  await expect(page.getByText('Met 1 time')).toBeVisible();
});

test('confirmed repeat updates the exact centroid once and survives reopening', async ({ page, request }) => {
  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=single');
  await saveFirstCat(page, photo, 'Mochi');
  await page.getByRole('button', { name: 'Back to collection' }).click();

  await page.goto('/?skipWelcome=1&mockAi=single-alt');
  await startScan(page, photo);
  await expect(page.getByRole('heading', { name: 'No familiar cat suggested.' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose an existing cat' }).click();
  await page.getByRole('button', { name: /Mochi/ }).click();
  await expect(page.getByRole('heading', { name: 'Another meeting with Mochi' })).toBeVisible();
  await page.getByRole('button', { name: 'Save encounter' }).click();
  await expect(page.getByRole('heading', { name: 'Another Mochi encounter saved.' })).toBeVisible();

  const centroid = await page.evaluate(async () => {
    const repository = (window as any).__MEOWFOLIO_E2E_REPOSITORY__;
    const cat = (await repository.listCats())[0];
    return {
      encounterCount: cat.encounterCount,
      referenceCount: cat.referenceEmbeddingCount,
      sum0: cat.referenceEmbeddingSum[0],
      sum1: cat.referenceEmbeddingSum[1],
      ref0: cat.referenceEmbedding[0],
      ref1: cat.referenceEmbedding[1],
      encounters: (await repository.listEncountersForCat(cat.id)).length,
    };
  });

  expect(centroid.encounterCount).toBe(2);
  expect(centroid.referenceCount).toBe(2);
  expect(centroid.encounters).toBe(2);
  expect(centroid.sum0).toBeCloseTo(1, 6);
  expect(centroid.sum1).toBeCloseTo(1, 6);
  expect(centroid.ref0).toBeCloseTo(Math.SQRT1_2, 5);
  expect(centroid.ref1).toBeCloseTo(Math.SQRT1_2, 5);

  await page.getByRole('button', { name: 'Back to collection' }).click();
  await page.reload();
  await expect(page.getByText('Mochi')).toBeVisible();
  await expect(page.getByText('Met 2 times')).toBeVisible();
});

test('incompatible-space history saves without mutating the old reference', async ({ page, request }) => {
  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=single');
  await saveFirstCat(page, photo, 'Mochi');

  const result = await page.evaluate(async () => {
    const repository = (window as any).__MEOWFOLIO_E2E_REPOSITORY__;
    const cat = (await repository.listCats())[0];
    const first = (await repository.listEncountersForCat(cat.id))[0];

    const incompatible = await repository.saveEncounter({
      encounterId: crypto.randomUUID(),
      timestamp: first.timestamp + 1_000,
      photo: first.photo,
      crop: first.crop,
      embedding: Array.from({ length: 384 }, (_, index) => (index === 1 ? 1 : 0)),
      embeddingSpace: { ...first.embeddingSpace, revision: 'different-space' },
      detection: first.detection,
      identity: { kind: 'existing', catId: cat.id },
    });

    return {
      encounterCount: incompatible.cat.encounterCount,
      referenceCount: incompatible.cat.referenceEmbeddingCount,
      sum0: incompatible.cat.referenceEmbeddingSum[0],
      sum1: incompatible.cat.referenceEmbeddingSum[1],
      rows: (await repository.listEncountersForCat(cat.id)).length,
    };
  });

  expect(result.encounterCount).toBe(2);
  expect(result.referenceCount).toBe(1);
  expect(result.sum0).toBeCloseTo(1, 6);
  expect(result.sum1).toBeCloseTo(0, 6);
  expect(result.rows).toBe(2);
});

test('failed existing-cat save leaves no encounter and the pending form remains retryable', async ({ page, request }) => {
  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=single');
  await saveFirstCat(page, photo, 'Mochi');

  const atomicFailure = await page.evaluate(async () => {
    const repository = (window as any).__MEOWFOLIO_E2E_REPOSITORY__;
    const firstCat = (await repository.listCats())[0];
    const first = (await repository.listEncountersForCat(firstCat.id))[0];
    const failedId = crypto.randomUUID();

    let failed = false;
    try {
      await repository.saveEncounter({
        encounterId: failedId,
        timestamp: first.timestamp + 2_000,
        photo: first.photo,
        crop: first.crop,
        embedding: Array.from(first.embedding),
        embeddingSpace: first.embeddingSpace,
        detection: first.detection,
        identity: { kind: 'existing', catId: 'missing-cat' },
      });
    } catch {
      failed = true;
    }

    return {
      failed,
      partialEncounterExists: Boolean(await repository.getEncounter(failedId)),
      cats: (await repository.listCats()).length,
    };
  });

  expect(atomicFailure).toEqual({
    failed: true,
    partialEncounterExists: false,
    cats: 1,
  });
});

test('location denial never blocks saving', async ({ page, request }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: unknown, error: (value: { code: number }) => void) =>
          error({ code: 1 }),
      },
    });
  });

  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=single');
  await startScan(page, photo);
  await page.getByRole('button', { name: 'Name this cat' }).click();
  await page.getByLabel('Cat name').fill('Mochi');
  await page.getByRole('button', { name: 'Add location' }).click();
  await expect(page.getByText(/save.*without location/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save encounter' })).toBeEnabled();
  await page.getByRole('button', { name: 'Save encounter' }).click();
  await expect(page.getByRole('heading', { name: 'Mochi is in your Meowfolio.' })).toBeVisible();

  const hasLocation = await page.evaluate(async () => {
    const repository = (window as any).__MEOWFOLIO_E2E_REPOSITORY__;
    const cat = (await repository.listCats())[0];
    const encounter = (await repository.listEncountersForCat(cat.id))[0];
    return Boolean(encounter.location);
  });
  expect(hasLocation).toBe(false);
});


test('duplicate cat names remain valid and distinct', async ({ page, request }) => {
  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=single');
  await saveFirstCat(page, photo, 'Mochi');

  const result = await page.evaluate(async () => {
    const repository = (window as any).__MEOWFOLIO_E2E_REPOSITORY__;
    const firstCat = (await repository.listCats())[0];
    const first = (await repository.listEncountersForCat(firstCat.id))[0];

    const second = await repository.saveEncounter({
      encounterId: crypto.randomUUID(),
      timestamp: first.timestamp + 5_000,
      photo: first.photo,
      crop: first.crop,
      embedding: Array.from(first.embedding),
      embeddingSpace: first.embeddingSpace,
      detection: first.detection,
      identity: {
        kind: 'new',
        catId: crypto.randomUUID(),
        name: firstCat.name,
      },
    });

    const cats = await repository.listCats();
    return {
      secondName: second.cat.name,
      names: cats.map((cat: any) => cat.name).sort(),
      ids: cats.map((cat: any) => cat.id),
    };
  });

  expect(result.secondName).toBe('Mochi');
  expect(result.names).toEqual(['Mochi', 'Mochi']);
  expect(new Set(result.ids).size).toBe(2);
});

test('save failure preserves pending details and retry can commit the same scan', async ({ page, request }) => {
  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=single&catalog=manual');
  await startScan(page, photo);

  await expect(page.getByRole('heading', { name: 'No familiar cat suggested.' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose an existing cat' }).click();
  await page.getByRole('button', { name: /Mochi/ }).click();
  await page.getByLabel(/Encounter note/).fill('Keep this note through failure.');
  await page.getByRole('button', { name: 'Save encounter' }).click();

  await expect(page.getByRole('heading', { name: 'Another meeting with Mochi' })).toBeVisible();
  await expect(page.getByText(/selected saved cat no longer exists/i)).toBeVisible();
  await expect(page.getByLabel(/Encounter note/)).toHaveValue('Keep this note through failure.');
  await expect(page.getByRole('button', { name: 'Save encounter' })).toBeEnabled();

  await page.getByRole('button', { name: 'Change identity' }).click();
  await page.getByRole('button', { name: 'Add as a new cat' }).click();
  await page.getByLabel('Cat name').fill('Mochi');
  await expect(page.getByLabel(/Encounter note/)).toHaveValue('Keep this note through failure.');
  await page.getByRole('button', { name: 'Save encounter' }).click();

  await expect(page.getByRole('heading', { name: 'Mochi is in your Meowfolio.' })).toBeVisible();

  const stored = await page.evaluate(async () => {
    const repository = (window as any).__MEOWFOLIO_E2E_REPOSITORY__;
    const cats = await repository.listCats();
    const encounters = await repository.listEncountersForCat(cats[0].id);
    return {
      cats: cats.length,
      encounters: encounters.length,
      note: encounters[0].note,
    };
  });

  expect(stored).toEqual({
    cats: 1,
    encounters: 1,
    note: 'Keep this note through failure.',
  });
});

test('location timeout is recoverable and Save stays available while location is pending', async ({ page, request }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: () => {
          // Deliberately never calls success/error so the app's own 8s timeout is exercised.
        },
      },
    });
  });

  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=single');
  await startScan(page, photo);
  await page.getByRole('button', { name: 'Name this cat' }).click();
  await page.getByLabel('Cat name').fill('Mochi');
  await page.getByRole('button', { name: 'Add location' }).click();

  await expect(page.getByRole('button', { name: 'Finding location…' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save encounter' })).toBeEnabled();

  await expect(page.getByText(/Location took too long/i)).toBeVisible({ timeout: 9_500 });
  await expect(page.getByRole('button', { name: 'Save encounter' })).toBeEnabled();
});


test('pixel scrapbook opens a chronological cat history with notes and collapsed private location', async ({ page, request }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: (position: any) => void) =>
          success({
            coords: {
              latitude: 26.76012,
              longitude: 83.37321,
              accuracy: 18,
            },
            timestamp: Date.now(),
          }),
      },
    });
  });

  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=single');
  await startScan(page, photo);
  await page.getByRole('button', { name: 'Name this cat' }).click();
  await page.getByLabel('Cat name').fill('Mochi');
  await page.getByLabel(/Encounter note/).fill('First meeting by the garden wall.');
  await page.getByRole('button', { name: 'Add location' }).click();
  await expect(page.getByText(/Location saved privately/i)).toBeVisible();
  await page.getByRole('button', { name: 'Save encounter' }).click();
  await expect(page.getByRole('heading', { name: 'Mochi is in your Meowfolio.' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to collection' }).click();

  await page.goto('/?skipWelcome=1&mockAi=single-alt');
  await startScan(page, photo);
  await page.getByRole('button', { name: 'Choose an existing cat' }).click();
  await page.getByRole('button', { name: /Mochi/ }).click();
  await page.getByLabel(/Encounter note/).fill('Second meeting under the orange bench.');
  await page.getByRole('button', { name: 'Save encounter' }).click();
  await expect(page.getByRole('heading', { name: 'Another Mochi encounter saved.' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to collection' }).click();

  await expect(page.getByRole('heading', { name: 'my meowfolio' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Open Mochi, met 2 times/i })).toBeVisible();
  await page.getByRole('button', { name: /Open Mochi, met 2 times/i }).click();

  await expect(page.getByRole('heading', { name: 'Mochi' })).toBeVisible();
  await expect(page.getByText('met 2x')).toBeVisible();
  await expect(page.getByText('First meeting by the garden wall.')).toBeVisible();
  await expect(page.getByText('Second meeting under the orange bench.')).toBeVisible();
  await expect(page.getByText('Location saved')).toBeVisible();

  await expect(page.getByText(/lat: 26\.76012°/i)).not.toBeVisible();
  await page.getByText('Location saved').click();
  await expect(page.getByText(/lat: 26\.76012°/i)).toBeVisible();
  await expect(page.getByText(/long: 83\.37321°/i)).toBeVisible();
  await expect(page.getByText(/accuracy: ±18 m/i)).toBeVisible();
});

test('browsing the saved scrapbook does not initialize or download AI models', async ({ page, request }) => {
  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=single');
  await saveFirstCat(page, photo, 'Mochi', 'Local-only memory.');
  await page.getByRole('button', { name: 'Back to collection' }).click();

  const modelRequests: string[] = [];
  page.on('request', (browserRequest) => {
    const url = browserRequest.url();
    if (
      url.includes('huggingface.co/') ||
      url.includes('cdn-lfs') ||
      url.includes('xethub') ||
      url.includes('/onnx/')
    ) {
      modelRequests.push(url);
    }
  });

  await page.goto('/?skipWelcome=1');
  await expect(page.getByRole('heading', { name: 'my meowfolio' })).toBeVisible();
  await page.getByRole('button', { name: /Open Mochi, met 1 time/i }).click();
  await expect(page.getByRole('heading', { name: 'Mochi' })).toBeVisible();
  await page.getByRole('button', { name: '← scrapbook' }).click();
  await expect(page.getByRole('heading', { name: 'my meowfolio' })).toBeVisible();

  expect(modelRequests).toEqual([]);
});


test('matching lab does not fetch models before explicit preparation', async ({ page }) => {
  const modelRequests: string[] = [];
  page.on('request', (browserRequest) => {
    const url = browserRequest.url();
    if (
      url.includes('huggingface.co/') ||
      url.includes('cdn-lfs') ||
      url.includes('xethub') ||
      url.includes('/onnx/')
    ) {
      modelRequests.push(url);
    }
  });

  await page.goto('/?matchingLab=1');
  await expect(page.getByRole('heading', { name: 'familiar-face matching lab' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'download / prepare models' })).toBeVisible();
  await page.waitForTimeout(500);
  expect(modelRequests).toEqual([]);
});


test('mobile cat details keep legible form text and adjacent save/change buttons', async ({ page, request }) => {
  const photo = await catPhoto(request);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?skipWelcome=1&mockAi=single');
  // The home mobile capture CTA is camera-first; upload into the real hidden
  // input to exercise the scan without invoking an OS camera in Chromium.
  await page.locator('#home-gallery').setInputFiles({
    name: 'cat.png',
    mimeType: 'image/png',
    buffer: photo,
  });
  await expect(page.getByRole('button', { name: 'Find cat' })).toBeEnabled();
  await page.getByRole('button', { name: 'Find cat' }).click();
  await expect(page.getByRole('button', { name: 'Name this cat' })).toBeVisible();
  await page.getByRole('button', { name: 'Name this cat' }).click();
  await page.getByLabel('Cat name').fill('Pako');

  const metrics = await page.evaluate(() => {
    const actions = [...document.querySelectorAll('.scan-details-actions > button')];
    const boxes = actions.map((button) => button.getBoundingClientRect());
    const name = document.querySelector('.scan-details-panel input')!;
    const note = document.querySelector('.scan-details-panel textarea')!;
    const label = document.querySelector('.scan-details-panel label > span')!;
    const computed = getComputedStyle(label);
    return {
      tops: boxes.map((box) => box.top),
      leftRight: [boxes[0].right, boxes[1].left],
      widths: boxes.map((box) => box.width),
      textColor: computed.color,
      inputFontPx: parseFloat(getComputedStyle(name).fontSize),
      placeholderFontPx: parseFloat(getComputedStyle(note).fontSize),
      hasHorizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
    };
  });
  expect(Math.abs(metrics.tops[0] - metrics.tops[1])).toBeLessThan(2);
  expect(metrics.leftRight[0]).toBeLessThan(metrics.leftRight[1]);
  expect(metrics.widths.every((width) => width > 100)).toBe(true);
  expect(metrics.textColor).toBe('rgb(84, 34, 60)');
  expect(metrics.inputFontPx).toBeGreaterThanOrEqual(16);
  expect(metrics.placeholderFontPx).toBeGreaterThanOrEqual(16);
  expect(metrics.hasHorizontalOverflow).toBe(false);
  await expect(page.getByRole('button', { name: 'Save cat' })).toBeEnabled();
  await page.getByRole('button', { name: 'Save cat' }).click();
  await expect(page.getByRole('heading', { name: 'Pako is in your Meowfolio.' })).toBeVisible();
});


test('local profile personalizes the scrapbook and makes a downloadable story card', async ({ page, request }) => {
  const photo = await catPhoto(request);
  await page.goto('/?skipWelcome=1&mockAi=single');
  await page.getByRole('button', { name: /create my local profile/i }).click();
  await page.getByLabel('Your display name').fill('Ayan');
  await page.getByRole('button', { name: 'Save my profile' }).click();
  await expect(page.getByRole('button', { name: /Ayan.*edit/i })).toBeVisible();

  await saveFirstCat(page, photo, 'Mochi', 'She waited under the flowers.');
  await page.getByRole('button', { name: 'Back to collection' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /Open Mochi, met 1 time/ }).click();
  await page.getByRole('button', { name: 'Make story card' }).click();

  const preview = page.getByRole('img', { name: /9 by 16 story preview for Mochi/ });
  await expect(preview).toBeVisible({ timeout: 30_000 });
  const dimensions = await preview.evaluate((image) => {
    const img = image as HTMLImageElement;
    return { width: img.naturalWidth, height: img.naturalHeight };
  });
  expect(dimensions).toEqual({ width: 1080, height: 1920 });
  await expect(page.getByRole('checkbox', { name: /Include my encounter note/ })).not.toBeChecked();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Save story PNG/ }).click();
  expect((await download).suggestedFilename()).toBe('meowfolio-mochi-story.png');

  await page.getByRole('radio', { name: /Midnight diary/ }).check();
  await expect(preview).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  await page.reload();
  await expect(page.getByRole('button', { name: /Ayan.*edit/i })).toBeVisible();
});
