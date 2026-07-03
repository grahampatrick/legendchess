import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { INITIAL_FEN, validatePuzzle } from '@playthelegend/core';

import { destsFromUcis, promotionChoices } from '../src/lib/dests';
import { framesFromSan, preludeFrames, remainderFrames, revealFrames } from '../src/lib/timeline';

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

describe('timeline frames', () => {
  it('prelude walks from the initial position to startFen', () => {
    const frames = preludeFrames(puzzle);
    expect(frames).toHaveLength(puzzle.prelude.san.length + 1);
    expect(frames[0]!.fen).toBe(INITIAL_FEN);
    expect(frames[0]!.lastMove).toBeUndefined();
    expect(frames.at(-1)!.fen).toBe(puzzle.startFen);
    expect(frames[1]!.lastMove).toEqual(['e2', 'e4']);
  });

  it('reveal frames play the hero move then the reply', () => {
    const frames = revealFrames(puzzle, 0, puzzle.startFen);
    expect(frames).toHaveLength(2);
    expect(frames[0]!.lastMove).toEqual(['d1', 'd4']); // 24.Rxd4
    expect(frames[1]!.lastMove).toEqual(['c5', 'd4']); // 24...cxd4
  });

  it('remainder from index 0 covers every remaining ply of the game', () => {
    const frames = remainderFrames(puzzle, 0, puzzle.startFen);
    const dpPlies = puzzle.decisionPoints.reduce((n, dp) => n + (dp.reply ? 2 : 1), 0);
    expect(frames).toHaveLength(dpPlies + puzzle.finale.san.length);
    // Final frame is the end of the game: Black to move after 44.Qa7.
    expect(frames.at(-1)!.fen).toMatch(/ b - - \d+ 44$/);
  });

  it('framesFromSan throws on a SAN that does not replay', () => {
    expect(() => framesFromSan(puzzle.startFen, ['Qh5'])).toThrow();
  });
});

describe('dests mapping', () => {
  it('groups legal UCIs by origin square', () => {
    const dests = destsFromUcis(['e2e4', 'e2e3', 'g1f3']);
    expect(dests.get('e2')).toEqual(['e4', 'e3']);
    expect(dests.get('g1')).toEqual(['f3']);
  });

  it('dedupes promotion variants into one destination', () => {
    const dests = destsFromUcis(['e7e8q', 'e7e8r', 'e7e8b', 'e7e8n']);
    expect(dests.get('e7')).toEqual(['e8']);
  });

  it('detects promotion choices for a from/to pair', () => {
    const ucis = ['e7e8q', 'e7e8r', 'e7e8b', 'e7e8n', 'g1f3'];
    expect(promotionChoices(ucis, 'e7', 'e8')).toHaveLength(4);
    expect(promotionChoices(ucis, 'g1', 'f3')).toHaveLength(0);
  });
});
