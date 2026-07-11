import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { LEGENDS } from '../../src/data/legends';
import { releaseDateKey } from '../../src/lib/daily';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const calendar = JSON.parse(readFileSync(path.join(ROOT, 'content/calendar.json'), 'utf8')) as {
  days: { date: string; puzzleId: string }[];
};

// Mirror the app's progressive reveal: heroes of puzzles released so far.
const todayKey = releaseDateKey(new Date());
const releasedIds = new Set(calendar.days.filter((d) => d.date <= todayKey).map((d) => d.puzzleId));
const releasedHeroes = new Set(
  [...releasedIds].map(
    (id) =>
      (
        JSON.parse(readFileSync(path.join(ROOT, `dist/puzzles/${id}.json`), 'utf8')) as {
          meta: { heroName: string };
        }
      ).meta.heroName,
  ),
);
const revealed = LEGENDS.filter((l) => releasedHeroes.has(l.heroName));
const hidden = LEGENDS.length - revealed.length;

test('legends page reveals exactly the legends whose games have released', async ({ page }) => {
  await page.goto('/legends');
  await expect(page.locator('.legend-card:not(.legend-locked)')).toHaveCount(revealed.length);

  // Every revealed legend has a licensed portrait and released game links only.
  await expect(page.locator('.legend-card:not(.legend-locked) img.legend-portrait')).toHaveCount(
    revealed.length,
  );
  for (const card of await page.locator('.legend-card:not(.legend-locked) .legend-games a').all()) {
    const href = await card.getAttribute('href');
    expect([...releasedIds].some((id) => href?.includes(id))).toBe(true);
  }

  // The unreleased remainder shows as a locked teaser — no count, no names
  // (the library grows; never cap expectations at today's roster).
  if (hidden > 0) {
    await expect(page.getByTestId('locked-legends')).toContainText('A new legend joins every day');
    await expect(page.getByTestId('locked-legends')).not.toContainText(String(hidden));
  }

  // Attribution stays one click away — a license requirement, not decoration.
  await expect(page.locator('a[href*="licenses.md"]')).toBeVisible();
});

test('intro card carries the legend line with a link to the bio', async ({ page }) => {
  await page.goto('/');
  const line = page.locator('.legend-line');
  await expect(line).toBeVisible();
  await expect(line).toContainText('meet the legend');
});
