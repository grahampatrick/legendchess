/**
 * Daily-loop e2e: day number, refresh-restore mid-game, completion with the
 * LOCKED share format read back from the clipboard, streak, and countdown.
 * Today's puzzle is resolved from the same calendar the server reads.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import { releaseDateKey } from '../../src/lib/daily';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

interface CalendarDay {
  date: string;
  puzzleId: string;
}

const calendar = JSON.parse(readFileSync(path.join(ROOT, 'content/calendar.json'), 'utf8')) as {
  days: CalendarDay[];
};

const todayKey = releaseDateKey(new Date());
const dayIndex = calendar.days.findIndex((d) => d.date === todayKey);
const entry = dayIndex >= 0 ? calendar.days[dayIndex]! : null;

interface FixturePuzzle {
  meta: { heroName: string; event: string; year: number };
  decisionPoints: { hero: { uci: string } }[];
}

const puzzle: FixturePuzzle | null = entry
  ? JSON.parse(readFileSync(path.join(ROOT, `dist/puzzles/${entry.puzzleId}.json`), 'utf8'))
  : null;

test.skip(!entry || !puzzle, 'calendar has no entry for today — regenerate content/calendar.json');

const startDaily = async (page: Page) => {
  await page.goto('/');
  await page.getByTestId('start-btn').click();
  await page.getByTestId('skip-btn').click();
  await expect(page.getByTestId('uci-input')).toBeVisible();
};

const typeMove = async (page: Page, uci: string) => {
  await expect(page.getByTestId('uci-input')).toBeVisible({ timeout: 15_000 });
  const input = page.getByTestId('uci-input');
  await input.fill(uci);
  await input.press('Enter');
};

test('daily page shows the day number and persists progress across reload', async ({ page }) => {
  await startDaily(page);
  await expect(page.getByTestId('move-counter')).toContainText('Move 1');

  // Play two hero moves, then reload mid-game.
  await typeMove(page, puzzle!.decisionPoints[0]!.hero.uci);
  await typeMove(page, puzzle!.decisionPoints[1]!.hero.uci);
  await expect(page.getByTestId('progress-grid')).toContainText('🟩🟩');

  await page.reload();
  // No intro, no replay — straight back into the game at move 3.
  await expect(page.getByTestId('status')).toContainText('Welcome back', { timeout: 15_000 });
  await expect(page.getByTestId('move-counter')).toContainText('Move 3');
  await expect(page.getByTestId('progress-grid')).toContainText('🟩🟩');
});

test('completing the daily: locked share format, streak, countdown', async ({ page }) => {
  // Capture analytics calls: the retention buckets must ride game_complete.
  await page.addInitScript(() => {
    const w = window as unknown as { __events: unknown[]; plausible: (...a: unknown[]) => void };
    w.__events = [];
    w.plausible = (...args: unknown[]) => w.__events.push(args);
  });
  await startDaily(page);
  for (const dp of puzzle!.decisionPoints) {
    await typeMove(page, dp.hero.uci);
  }
  await expect(page.getByTestId('done-card')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('streak')).toContainText('1-day streak');
  await expect(page.getByTestId('countdown')).toContainText('Next legend in');

  // game_complete carries the identifier-free retention buckets.
  const events = (await page.evaluate(
    () => (window as unknown as { __events: unknown[] }).__events,
  )) as [string, { props?: Record<string, string | number> }][];
  const complete = events.find(([name]) => name === 'game_complete');
  expect(complete).toBeDefined();
  expect(complete![1].props).toMatchObject({ streak: '1', games: '1', outcome: 'solved' });

  await page.getByTestId('share-btn').click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  const n = puzzle!.decisionPoints.length;
  // The locked share format (core snapshot owns the canonical string; this
  // asserts the daily page feeds it the right day number and outcome).
  expect(clipboard).toBe(
    [
      `LegendChess #${dayIndex + 1} — ${puzzle!.meta.heroName}, ${puzzle!.meta.event} ${puzzle!.meta.year}`,
      `♞${'🟩'.repeat(n)}`,
      `❤❤❤❤❤ ${n * 100}/${n * 100}`,
    ].join('\n'),
  );

  // The story image renders on-device and downloads on desktop (mobile gets
  // the native share sheet → Instagram Stories).
  const download = page.waitForEvent('download');
  await page.getByTestId('story-btn').click();
  expect((await download).suggestedFilename()).toBe(`legendchess-day-${dayIndex + 1}.png`);

  // A completed day restores to the done card, not to the game.
  await page.reload();
  await expect(page.getByTestId('done-card')).toBeVisible({ timeout: 15_000 });

  // Lifetime stats recorded the perfect day.
  await page.getByTestId('done-stats').click();
  await expect(page.getByTestId('stats')).toBeVisible();
  await expect(page.getByTestId('stat-played')).toHaveText('1');
  await expect(page.getByTestId('stats')).toContainText('Perfect');
});

test('free play (/play) never touches the streak', async ({ page }) => {
  await page.goto(`/play/${entry!.puzzleId}`);
  await page.getByTestId('start-btn').click();
  await page.getByTestId('skip-btn').click();
  await typeMove(page, puzzle!.decisionPoints[0]!.hero.uci);
  const stored = await page.evaluate(() => window.localStorage.getItem('legendchess.v1'));
  expect(stored).toBeNull();
});
