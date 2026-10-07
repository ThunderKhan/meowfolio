import { expect, test } from '@playwright/test';

const CAT_PHOTO =
  'https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/cats.png';

test('real WASM cat detection and DINOv2 embedding complete in Chromium', async ({
  page,
  request,
}) => {
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

  await page.getByRole('button', { name: 'Find the cat' }).click();
  const consent = page.getByRole('button', { name: 'Download models & continue' });
  await expect(consent).toBeVisible();
  await consent.click();

  await expect(page.getByText(/cats? found\./i)).toBeVisible({ timeout: 180_000 });
  const firstCat = page.getByRole('button', { name: /Cat 1.*detector score/i });
  await expect(firstCat).toBeVisible();
  await firstCat.click();

  await expect(
    page.getByText(/Local pipeline complete: cat crop → normalized 384-value DINOv2 embedding\./i),
  ).toBeVisible({ timeout: 120_000 });

  await expect(page.getByText('384', { exact: true })).toBeVisible();
  await expect(page.getByText('wasm', { exact: true })).toBeVisible();
});
