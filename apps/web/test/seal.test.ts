import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { validatePuzzle } from '@legendchess/core';

import { SealedPuzzleSchema, sealPuzzle, unsealPuzzle } from '../src/lib/seal';

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

describe('anti-spoiler seal (ADR 0005)', () => {
  it('round-trips a real puzzle exactly', () => {
    const sealed = SealedPuzzleSchema.parse(sealPuzzle(puzzle));
    expect(unsealPuzzle(sealed)).toEqual(puzzle);
  });

  it('the payload does not contain solution SAN or UCI in cleartext', () => {
    const serialized = JSON.stringify(sealPuzzle(puzzle));
    // (15.Rxd4 legitimately appears in the cleartext prelude; assert on
    // strings that exist only in the solution window and finale.)
    expect(serialized).not.toContain('Re7+'); // 25.Re7+!!
    expect(serialized).not.toContain('Qa7'); // 44.Qa7, the final move
    expect(serialized).not.toContain('d1d4'); // solution UCI
    expect(serialized).not.toContain('"evals"');
    // Non-spoiler context stays readable for meta tags and the intro screen.
    expect(serialized).toContain('Kasparov');
    expect(serialized).toContain(puzzle.startFen);
  });

  it('exposes the point count for the empty progress grid', () => {
    expect(sealPuzzle(puzzle).pointCount).toBe(10);
  });
});
