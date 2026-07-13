/**
 * End-to-end: plays fixture puzzle 0001 (Kasparov's Immortal) through the real
 * UI — win path via the keyboard move input, out-of-lives path, and one
 * board-click move. The same shared fixture that core and forge test against.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

interface FixturePuzzle {
  startFen: string;
  meta: { heroColor: 'white' | 'black' };
  decisionPoints: {
    hero: { uci: string; san: string };
    evals: Record<string, number>;
  }[];
}

const puzzle: FixturePuzzle = JSON.parse(
  readFileSync(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../../fixtures/puzzles/0001-kasparov-topalov-1999.json',
    ),
    'utf8',
  ),
);

const PLAY_URL = '/play/0001-kasparov-topalov-1999';

const startAndSkipReplay = async (page: Page) => {
  await page.goto(PLAY_URL);
  await page.getByTestId('start-btn').click();
  await page.getByTestId('skip-btn').click();
  await expect(page.getByTestId('uci-input')).toBeVisible();
};

const typeMove = async (page: Page, uci: string) => {
  const input = page.getByTestId('uci-input');
  await input.fill(uci);
  await input.press('Enter');
};

/** Wait until the guess loop is accepting input again (reveal animation done). */
const waitForInput = async (page: Page) => {
  await expect(page.getByTestId('uci-input')).toBeVisible({ timeout: 15_000 });
};

test('win path: all ten hero moves → solved card, full-green grid, share text', async ({
  page,
}) => {
  await startAndSkipReplay(page);
  for (const dp of puzzle.decisionPoints) {
    await waitForInput(page);
    await typeMove(page, dp.hero.uci);
    await expect(page.getByTestId('status')).toContainText('exactly what Kasparov played', {
      timeout: 10_000,
    });
  }
  await expect(page.getByTestId('done-card')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('done-card')).toContainText('You played like Kasparov');
  await expect(page.getByTestId('grid')).toHaveText('🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩');
  await expect(page.getByTestId('final-score')).toContainText('1000 / 1000');
});

test('out of lives: five bad moves → spectator playback → dark grid', async ({ page }) => {
  const dp = puzzle.decisionPoints[0]!;
  const heroCp = dp.evals[dp.hero.uci]!;
  const bad = Object.entries(dp.evals)
    .filter(([uci, cp]) => uci !== dp.hero.uci && cp < heroCp - 200)
    .map(([uci]) => uci);
  test.skip(bad.length < 5, 'fixture must offer five clearly bad moves');

  await startAndSkipReplay(page);
  await typeMove(page, bad[0]!);
  await expect(page.getByTestId('hint')).toContainText('rook moves');
  await typeMove(page, bad[1]!);
  await expect(page.getByTestId('hint')).toContainText('lands on d4');
  await typeMove(page, bad[2]!);
  await typeMove(page, bad[3]!);
  await typeMove(page, bad[4]!);
  await expect(page.getByTestId('status')).toContainText('Out of lives');
  // Spectator playback runs the remaining ~30 plies, then the done card shows.
  await expect(page.getByTestId('done-card')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('done-card')).toContainText('finishes without you');
  await expect(page.getByTestId('grid')).toHaveText('⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛');
});

test('illegal and malformed input is rejected without costing a life', async ({ page }) => {
  await startAndSkipReplay(page);
  await typeMove(page, 'zz99');
  await expect(page.getByTestId('status')).toContainText('not a legal move');
  await typeMove(page, 'e2e4'); // well-formed but illegal (e2 is empty at move 24)
  await expect(page.getByTestId('status')).toContainText('not a legal move');
  await expect(page.getByTestId('lives')).toHaveAttribute('aria-label', '5 lives left');
});

test('board click-move: d1 then d4 plays 24.Rxd4', async ({ page }) => {
  await startAndSkipReplay(page);
  const board = page.getByTestId('board');
  const box = await board.boundingBox();
  expect(box).not.toBeNull();
  // White orientation: a1 is bottom-left; square size is 1/8 of the board.
  const sq = (name: string) => {
    const file = name.charCodeAt(0) - 97;
    const rank = Number(name[1]) - 1;
    return {
      x: box!.x + (file + 0.5) * (box!.width / 8),
      y: box!.y + (7 - rank + 0.5) * (box!.height / 8),
    };
  };
  const from = sq('d1');
  const to = sq('d4');
  await page.mouse.click(from.x, from.y);
  await page.mouse.click(to.x, to.y);
  await expect(page.getByTestId('status')).toContainText('exactly what Kasparov played', {
    timeout: 10_000,
  });
});

test('hint button escalates and downgrades the square', async ({ page }) => {
  await startAndSkipReplay(page);
  await page.getByTestId('hint-btn').click();
  await expect(page.getByTestId('hint')).toContainText('rook moves');
  await page.getByTestId('hint-btn').click();
  await expect(page.getByTestId('hint')).toContainText('lands on d4');
  await typeMove(page, puzzle.decisionPoints[0]!.hero.uci);
  // Two hints then exact → resolves at level 1 (🟥) on the progress grid.
  await expect(page.getByTestId('progress-grid')).toContainText('🟥');
});
