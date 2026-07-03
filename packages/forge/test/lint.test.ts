import { describe, expect, it } from 'vitest';

import type { Puzzle } from '@playthelegend/core';

import { lintPuzzle } from '../src/lint.js';

/** lint only reads decisionPoints, so a minimal stub is safe here. */
const puzzleWith = (dps: Puzzle['decisionPoints']): Puzzle =>
  ({ decisionPoints: dps }) as unknown as Puzzle;

const dp = (
  ply: number,
  heroUci: string,
  heroSan: string,
  evals: Record<string, number>,
): Puzzle['decisionPoints'][number] => ({
  ply,
  hero: { uci: heroUci, san: heroSan },
  evals,
  reply: null,
});

describe('lintPuzzle', () => {
  it('flags only-moves and near-forced points', () => {
    const warnings = lintPuzzle(
      puzzleWith([
        dp(1, 'e1e2', 'Ke2', { e1e2: 0 }),
        dp(3, 'e2e3', 'Ke3', { e2e3: 0, e2d2: -300, e2f2: -500 }),
      ]),
    );
    expect(warnings.map((w) => w.kind)).toEqual(['only-move', 'near-forced']);
  });

  it('flags hero moves far below the engine best', () => {
    const evals = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`a${1 + (i % 8)}b${1 + (i % 8)}`, -500]),
    );
    const warnings = lintPuzzle(
      puzzleWith([dp(1, 'h2h4', 'h4', { ...evals, h2h4: 0, g2g4: 200 })]),
    );
    expect(warnings.some((w) => w.kind === 'hero-inferior')).toBe(true);
  });

  it('flags points where 🟨 is too cheap', () => {
    const evals: Record<string, number> = { e2e4: 50 };
    for (let i = 0; i < 9; i++) evals[`b${1 + i}c${1 + i}` as string] = 45;
    const warnings = lintPuzzle(puzzleWith([dp(1, 'e2e4', 'e4', evals)]));
    expect(warnings.some((w) => w.kind === 'many-equivalents')).toBe(true);
  });

  it('stays quiet on a healthy decision point', () => {
    const evals: Record<string, number> = { e2e4: 50, d2d4: 30 };
    for (let i = 0; i < 18; i++) evals[`a${1 + (i % 8)}h${1 + (i % 8)}`] = -400 - i;
    expect(lintPuzzle(puzzleWith([dp(1, 'e2e4', 'e4', evals)]))).toEqual([]);
  });
});
