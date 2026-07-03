/**
 * Integration tests against the real fixture: Kasparov–Topalov, Wijk aan Zee
 * 1999, with genuine Stockfish 18 eval tables. This is the shared asset that
 * forge validation, web e2e, and server verification will also consume.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  RULES,
  createSession,
  emojiGrid,
  formatShareText,
  scoreSession,
  validatePuzzle,
  type Puzzle,
} from '../src/index';

const FIXTURE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../fixtures/puzzles/0001-kasparov-topalov-1999.json',
);

let puzzle: Puzzle;
beforeAll(() => {
  puzzle = validatePuzzle(JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')));
});

describe('fixture 0001 — shape and integrity', () => {
  it('passes full replay validation (validatePuzzle already ran in beforeAll)', () => {
    expect(puzzle.id).toBe('0001-kasparov-topalov-1999');
  });

  it('covers White moves 24–33 of the game', () => {
    expect(puzzle.meta.heroColor).toBe('white');
    expect(puzzle.prelude.san).toHaveLength(46);
    expect(puzzle.decisionPoints).toHaveLength(10);
    expect(puzzle.decisionPoints[0]?.hero).toEqual({ uci: 'd1d4', san: 'Rxd4' });
    expect(puzzle.decisionPoints[9]?.hero.san).toBe('c3+');
    expect(puzzle.finale.san).toHaveLength(21);
    expect(puzzle.finale.san.at(-1)).toBe('Qa7');
  });

  it('has a decision point with a second engine-equivalent move (🟨 is reachable)', () => {
    const equivalentAlternatives = puzzle.decisionPoints.map(
      (dp) =>
        Object.entries(dp.evals).filter(
          ([uci, cp]) =>
            uci !== dp.hero.uci && cp >= dp.evals[dp.hero.uci]! - RULES.cpEquivalenceThreshold,
        ).length,
    );
    expect(Math.max(...equivalentAlternatives)).toBeGreaterThan(0);
  });
});

describe('fixture 0001 — playthroughs', () => {
  it("28.Qc3 was not the engine's top choice — the better move earns 🟨, not 🟥", () => {
    // Plan (M1 pitfalls) requires a point where the hero move is not the
    // engine's best. Stockfish 18 rates 28.Qc3 below its top move here.
    const session = createSession(puzzle);
    for (const dp of puzzle.decisionPoints.slice(0, 4)) session.guess(dp.hero.uci);
    const dp = puzzle.decisionPoints[4]!; // ply 55, 28.Qc3
    const [bestUci, bestCp] = Object.entries(dp.evals).reduce((a, b) => (b[1] > a[1] ? b : a));
    expect(bestUci).not.toBe(dp.hero.uci);
    expect(bestCp).toBeGreaterThan(dp.evals[dp.hero.uci]!);
    expect(session.guess(bestUci).result).toBe('equivalent');
  });

  it('a perfect run: every hero move exact, full score, finale replayed', () => {
    const session = createSession(puzzle);
    for (const dp of puzzle.decisionPoints) {
      expect(session.guess(dp.hero.uci).result).toBe('exact');
    }
    const state = session.state();
    expect(state.phase).toBe('solved');
    expect(scoreSession(state.records)).toBe(1000);
    expect(emojiGrid(state.records)).toBe('🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩');
    // Final position after 44.Qa7, Black to move.
    expect(state.fen).toMatch(/ b - - \d+ 44$/);
  });

  it('three bad guesses at the first decision point → spectator mode', () => {
    const session = createSession(puzzle);
    const dp = puzzle.decisionPoints[0]!;
    const badMoves = Object.entries(dp.evals)
      .filter(([uci, cp]) => uci !== dp.hero.uci && cp < dp.evals[dp.hero.uci]! - 200)
      .map(([uci]) => uci);
    expect(badMoves.length).toBeGreaterThanOrEqual(3); // a brilliancy: most moves are bad
    session.guess(badMoves[0]!);
    session.guess(badMoves[1]!);
    const last = session.guess(badMoves[2]!);
    expect(last).toEqual({ result: 'miss', livesLeft: 0, done: true });
    const state = session.state();
    expect(state.phase).toBe('spectator');
    expect(emojiGrid(state.records)).toBe('⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛');
    expect(scoreSession(state.records)).toBe(0);
  });

  it('share text for a perfect day-1 run (format is a public API from M4)', () => {
    const session = createSession(puzzle);
    for (const dp of puzzle.decisionPoints) session.guess(dp.hero.uci);
    expect(formatShareText({ puzzle, state: session.state(), dayNumber: 1 })).toBe(
      [
        'Play the Legend #1 — Garry Kasparov, Hoogovens Tournament, Wijk aan Zee 1999',
        '♞🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩',
        '❤❤❤ 1000/1000',
      ].join('\n'),
    );
  });
});
