import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { validatePuzzle } from '@playthelegend/core';

import { VerificationError, verifySubmission, type SubmittedAction } from '../src/lib/verify';

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

const perfectLog: SubmittedAction[] = puzzle.decisionPoints.map((dp) => ({
  type: 'guess',
  uci: dp.hero.uci,
}));

const badMoves = Object.entries(puzzle.decisionPoints[0]!.evals)
  .filter(([uci, cp]) => uci !== puzzle.decisionPoints[0]!.hero.uci && cp < -400)
  .map(([uci]) => uci);

describe('verifySubmission (the server grades, never trusts)', () => {
  it('replays a perfect log to a perfect verified score', () => {
    expect(verifySubmission(puzzle, perfectLog)).toEqual({
      score: 1000,
      grid: '🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩',
      livesLeft: 3,
      solved: true,
    });
  });

  it('replays hints and misses to the same downgraded score the client saw', () => {
    const log: SubmittedAction[] = [{ type: 'hint' }, ...perfectLog];
    const verified = verifySubmission(puzzle, log);
    expect(verified.score).toBe(960); // first square 🟨 after one hint
    expect(verified.grid.startsWith('🟨')).toBe(true);
  });

  it('verifies an out-of-lives (spectator) finish', () => {
    const log: SubmittedAction[] = badMoves.slice(0, 3).map((uci) => ({ type: 'guess', uci }));
    const verified = verifySubmission(puzzle, log);
    expect(verified.solved).toBe(false);
    expect(verified.score).toBe(0);
    expect(verified.livesLeft).toBe(0);
  });

  it('rejects a log that does not finish the game', () => {
    expect(() => verifySubmission(puzzle, perfectLog.slice(0, 3))).toThrow(VerificationError);
  });

  it('rejects illegal moves in the log', () => {
    expect(() => verifySubmission(puzzle, [{ type: 'guess', uci: 'e2e4' }, ...perfectLog])).toThrow(
      VerificationError,
    );
  });

  it('rejects trailing actions after the game ended', () => {
    expect(() => verifySubmission(puzzle, [...perfectLog, { type: 'guess', uci: 'a2a3' }])).toThrow(
      VerificationError,
    );
  });
});
