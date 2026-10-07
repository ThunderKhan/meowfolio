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
  await expect(page.getByRole('heading', { name: 'Your cat scrapbook' })).toBeVisible();
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
