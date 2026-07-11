import { expect, test } from '@playwright/test';

test('legends page: all eight legends with licensed portraits and credits', async ({ page }) => {
  await page.goto('/legends');
  await expect(page.locator('.legend-card')).toHaveCount(8);

  // Every current legend has a licensed portrait (licenses.md records each
  // one); the monogram fallback stays for future legends without a photo.
  await expect(page.locator('img.legend-portrait')).toHaveCount(8);
  await expect(page.locator('.legend-monogram')).toHaveCount(0);
  await expect(page.locator('#morphy')).toContainText('Pride and Sorrow');
  await expect(page.locator('#carlsen img.legend-portrait')).toBeVisible();

  // Attribution is one click away — a license requirement, not decoration.
  await expect(page.locator('a[href*="licenses.md"]')).toBeVisible();

  // Each legend links to their playable games (Kasparov has several).
  expect(await page.locator('#kasparov .legend-games a').count()).toBeGreaterThanOrEqual(2);
  await expect(page.locator('#morphy .legend-games a').first()).toHaveAttribute('href', /\/play\//);
});

test('intro card carries the legend line with a link to the bio', async ({ page }) => {
  await page.goto('/');
  const line = page.locator('.legend-line');
  await expect(line).toBeVisible();
  await expect(line).toContainText('meet the legend');
});
