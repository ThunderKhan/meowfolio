import { expect, test } from '@playwright/test';

test('Home and Cats use browser history with Back Forward and refresh', async ({ page }) => {
  await page.goto('/?skipWelcome=1');
  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  await nav.getByRole('button', { name: 'Cats' }).click();
  await expect(page).toHaveURL(/view=cats/);
  await expect(nav.getByRole('button', { name: 'Cats' })).toHaveAttribute('aria-current', 'page');

  await page.goBack();
  await expect(page).not.toHaveURL(/view=cats/);
  await expect(nav.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');

  await page.goForward();
  await expect(page).toHaveURL(/view=cats/);
  await expect(nav.getByRole('button', { name: 'Cats' })).toHaveAttribute('aria-current', 'page');

  await page.reload();
  await expect(nav.getByRole('button', { name: 'Cats' })).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveURL(/view=cats/);
});

test('direct Studio link uses an in-app fallback instead of Back to an external page', async ({ page }) => {
  // Story data is browser-local, so a synthetic ID correctly shows an error.
  await page.goto('/studio/unknown-cat?skipWelcome=1');
  await expect(page.getByText('This cat memory is not available in this browser.')).toBeVisible();
  await page.getByRole('button', { name: 'Back to scrapbook' }).first().click();
  await expect(page).toHaveURL(/view=cats/);
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('button', { name: 'Cats' })).toHaveAttribute('aria-current', 'page');
});
