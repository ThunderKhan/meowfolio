import { expect, test } from '@playwright/test';

const CAT_PHOTO =
  'https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/cats.png';

test('real WASM cat detection and DINOv2 embedding complete in Chromium', async ({
  page,
  request,
}) => {
  const browserMessages: string[] = [];
  page.on('console', (message) => browserMessages.push('console ' + message.type() + ': ' + message.text()));
  page.on('pageerror', (error) => browserMessages.push('pageerror: ' + error.message));

  const photoResponse = await request.get(CAT_PHOTO);
  expect(photoResponse.ok()).toBeTruthy();
  const photo = await photoResponse.body();

  await page.goto('/');
  await page.getByLabel('Execution provider').selectOption('wasm');
  await page.locator('#cat-photo').setInputFiles({
    name: 'cats.png',
    mimeType: 'image/png',
    buffer: photo,
  });

  await expect(page.getByRole('button', { name: 'Find the cat' })).toBeEnabled();
  await page.getByRole('button', { name: 'Find the cat' }).click();

  const consent = page.getByRole('button', { name: 'Download models & continue' });
  try {
    await expect(consent).toBeVisible({ timeout: 45_000 });
  } catch (error) {
    const status = await page.getByTestId('status').textContent().catch(() => null);
    throw new Error(
      'Consent screen did not appear. Status: ' +
        JSON.stringify(status) +
        '\nBrowser messages:\n' +
        browserMessages.join('\n') +
        '\nOriginal assertion: ' +
        (error instanceof Error ? error.message : String(error)),
    );
  }

  await consent.click();

  const terminalStatus = page.getByTestId('status');
  await expect
    .poll(
      async () => (await terminalStatus.textContent()) ?? '',
      {
        timeout: 180_000,
        intervals: [250, 500, 1_000, 2_000],
      },
    )
    .toMatch(/cats? found\.|CONSENT_REQUIRED|INITIALIZATION_FAILED|DETECTION_FAILED/i);

  const statusAfterPreparation = (await terminalStatus.textContent()) ?? '';
  if (!/cats? found\./i.test(statusAfterPreparation)) {
    const networkAudit = await page
      .locator('details')
      .filter({ hasText: 'AI network audit' })
      .textContent()
      .catch(() => null);
    throw new Error(
      'Model preparation/detection failed. Status: ' +
        JSON.stringify(statusAfterPreparation) +
        '\nNetwork audit: ' +
        JSON.stringify(networkAudit) +
        '\nBrowser messages:\n' +
        browserMessages.join('\n'),
    );
  }

  const firstCat = page.getByRole('button', { name: /Cat 1.*detector score/i });
  await expect(firstCat).toBeVisible();
  await firstCat.click();

  await expect
    .poll(
      async () => (await page.getByTestId('status').textContent()) ?? '',
      {
        timeout: 120_000,
        intervals: [250, 500, 1_000, 2_000],
      },
    )
    .toMatch(/Local pipeline complete: cat crop → normalized 384-value DINOv2 embedding\.|EMBEDDING_FAILED|INVALID_EMBEDDING/i);

  const embeddingStatus = (await page.getByTestId('status').textContent()) ?? '';
  if (!/Local pipeline complete/i.test(embeddingStatus)) {
    throw new Error('Embedding failed. Status: ' + JSON.stringify(embeddingStatus));
  }

  await expect(page.getByText('384', { exact: true })).toBeVisible();
  await expect(page.getByText('wasm', { exact: true })).toBeVisible();

  // Prove the session-lived worker reuses initialized models on a second scan.
  const warmStarted = Date.now();
  await page.getByRole('button', { name: 'Find the cat' }).click();
  await expect
    .poll(
      async () => (await terminalStatus.textContent()) ?? '',
      {
        timeout: 120_000,
        intervals: [250, 500, 1_000, 2_000],
      },
    )
    .toMatch(/cats? found\.|DETECTION_FAILED/i);

  const warmDetectionStatus = (await terminalStatus.textContent()) ?? '';
  if (!/cats? found\./i.test(warmDetectionStatus)) {
    throw new Error('Warm detection failed. Status: ' + JSON.stringify(warmDetectionStatus));
  }

  await page.getByRole('button', { name: /Cat 1.*detector score/i }).click();
  await expect
    .poll(
      async () => (await terminalStatus.textContent()) ?? '',
      {
        timeout: 120_000,
        intervals: [250, 500, 1_000, 2_000],
      },
    )
    .toMatch(/Local pipeline complete: cat crop → normalized 384-value DINOv2 embedding\.|EMBEDDING_FAILED|INVALID_EMBEDDING/i);

  const warmFinalStatus = (await terminalStatus.textContent()) ?? '';
  if (!/Local pipeline complete/i.test(warmFinalStatus)) {
    throw new Error('Warm embedding failed. Status: ' + JSON.stringify(warmFinalStatus));
  }

  console.log('MEOWFOLIO_WARM_SECOND_SCAN_MS=' + (Date.now() - warmStarted));
});
