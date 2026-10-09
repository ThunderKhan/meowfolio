import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('backup download stays local and damaged import cannot destroy scrapbook', async ({ page }) => {
  const outbound: string[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'GET' && !request.url().startsWith('http://127.0.0.1:4174')) {
      outbound.push(request.url());
    }
  });
  await page.goto('/');
  await page.getByRole('button', { name: /open my scrapbook/i }).click();
  await page.getByText('Back up or restore my cats').click();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download backup' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^meowfolio-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(data.format).toBe('meowfolio-backup');
  expect(data.version).toBe(1);
  expect(data.cats).toEqual([]);
  expect(data.encounters).toEqual([]);

  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await page.getByLabel('Restore backup').setInputFiles({
    name: 'damaged.json',
    mimeType: 'application/json',
    buffer: Buffer.from('not a valid backup'),
  });
  await expect(page.getByRole('alert')).toContainText('not a valid Meowfolio backup');
  await expect(page.getByRole('heading', { name: /your meowfolio is empty/i })).toBeVisible();
  expect(outbound).toEqual([]);
});
