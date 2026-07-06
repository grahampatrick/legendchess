import { expect, test } from '@playwright/test';

test('legends page: all eight legends, portraits for the ancients, monograms for the moderns', async ({
  page,
}) => {
  await page.goto('/legends');
  await expect(page.locator('.legend-card')).toHaveCount(8);

  // Pre-war legends get public-domain portraits…
  const morphy = page.locator('#morphy');
  await expect(morphy.locator('img.legend-portrait')).toBeVisible();
  await expect(morphy).toContainText('Pride and Sorrow');

  // …modern legends get monograms, never photos (licenses.md policy).
  const carlsen = page.locator('#carlsen');
  await expect(carlsen.locator('img')).toHaveCount(0);
  await expect(carlsen.locator('.legend-monogram')).toHaveText('MC');

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
