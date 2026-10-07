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

  try {
    await expect(page.getByText(/cats? found\./i)).toBeVisible({ timeout: 180_000 });
  } catch (error) {
    const status = await page.getByTestId('status').textContent().catch(() => null);
    const networkAudit = await page
      .locator('details')
      .filter({ hasText: 'AI network audit' })
      .textContent()
      .catch(() => null);
    throw new Error(
      'Model preparation/detection did not reach a cat result. Status: ' +
        JSON.stringify(status) +
        '\nNetwork audit: ' +
        JSON.stringify(networkAudit) +
        '\nBrowser messages:\n' +
        browserMessages.join('\n') +
        '\nOriginal assertion: ' +
        (error instanceof Error ? error.message : String(error)),
    );
  }

  const firstCat = page.getByRole('button', { name: /Cat 1.*detector score/i });
  await expect(firstCat).toBeVisible();
  await firstCat.click();

  await expect(
    page.getByText(/Local pipeline complete: cat crop → normalized 384-value DINOv2 embedding\./i),
  ).toBeVisible({ timeout: 120_000 });

  await expect(page.getByText('384', { exact: true })).toBeVisible();
  await expect(page.getByText('wasm', { exact: true })).toBeVisible();
});
