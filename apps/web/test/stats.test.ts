import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { validatePuzzle } from '@playthelegend/core';

import { aggregateDaily, percentile } from '../src/lib/stats';
import type { SubmittedAction } from '../src/lib/verify';

const puzzle = validatePuzzle(
  JSON.parse(
    readFileSync(
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../../fixtures/puzzles/0001-kasparov-topalov-1999.json',
      ),
      'utf8',
    ),
  ),
);

const heroLog: SubmittedAction[] = puzzle.decisionPoints.map((dp) => ({
  type: 'guess',
  uci: dp.hero.uci,
}));

const badUcis = Object.entries(puzzle.decisionPoints[0]!.evals)
  .filter(([uci, cp]) => uci !== puzzle.decisionPoints[0]!.hero.uci && cp < -400)
  .map(([uci]) => uci);

describe('aggregateDaily', () => {
  it('counts first-try exact finds per decision point', () => {
    const perfect = { actions: heroLog, score: 1000, solved: true };
    // This player misses at point 0 once, then finds everything.
    const stumbler = {
      actions: [{ type: 'guess' as const, uci: badUcis[0]! }, ...heroLog],
      score: 940,
      solved: true,
    };
    const stats = aggregateDaily(puzzle, [perfect, stumbler]);
    expect(stats.players).toBe(2);
    expect(stats.solved).toBe(2);
    expect(stats.foundFirstTry[0]).toBe(0.5); // stumbler needed a retry at point 0
    expect(stats.foundFirstTry[1]).toBe(1); // both nailed point 1 first try
  });

  it('a hint before the guess disqualifies the first-try credit', () => {
    const hinted = {
      actions: [{ type: 'hint' as const }, ...heroLog],
      score: 960,
      solved: true,
    };
    const stats = aggregateDaily(puzzle, [hinted]);
    expect(stats.foundFirstTry[0]).toBe(0);
    expect(stats.foundFirstTry[1]).toBe(1);
  });

  it('rows that no longer replay are skipped, not fatal', () => {
    const broken = { actions: [{ type: 'guess' as const, uci: 'a1a8' }], score: 0, solved: false };
    const stats = aggregateDaily(puzzle, [broken, { actions: heroLog, score: 1000, solved: true }]);
    expect(stats.players).toBe(2);
    expect(stats.foundFirstTry[0]).toBe(0.5);
  });

  it('handles the empty day', () => {
    const stats = aggregateDaily(puzzle, []);
    expect(stats.players).toBe(0);
    expect(stats.foundFirstTry.every((f) => f === 0)).toBe(true);
  });
});

describe('percentile', () => {
  it('is the share of strictly lower scores', () => {
    expect(percentile(700, [200, 500, 700, 900])).toBe(50);
    expect(percentile(1000, [200, 500, 700, 900])).toBe(100);
    expect(percentile(100, [200, 500])).toBe(0);
    expect(percentile(500, [])).toBe(0);
  });
});
