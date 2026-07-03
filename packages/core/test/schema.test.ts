import { describe, expect, it } from 'vitest';

import { PuzzleSchema, validatePuzzle, PuzzleDataError } from '../src/index';
import { standardSynthetic } from './helpers/synthetic';

describe('PuzzleSchema', () => {
  it('accepts a well-formed puzzle', () => {
    expect(() => PuzzleSchema.parse(standardSynthetic())).not.toThrow();
  });

  it('rejects a malformed UCI key in an eval table', () => {
    const puzzle = standardSynthetic();
    const dp = puzzle.decisionPoints[0]!;
    (dp.evals as Record<string, number>)['Nf3'] = 10;
    expect(() => PuzzleSchema.parse(puzzle)).toThrow();
  });

  it('rejects an unknown schema version', () => {
    const puzzle = { ...standardSynthetic(), schemaVersion: 2 };
    expect(() => PuzzleSchema.parse(puzzle)).toThrow();
  });

  it('rejects a bad id slug', () => {
    const puzzle = { ...standardSynthetic(), id: 'Kasparov Immortal!' };
    expect(() => PuzzleSchema.parse(puzzle)).toThrow();
  });
});

describe('validatePuzzle replay integrity', () => {
  it('rejects an eval table that misses a legal move', () => {
    const puzzle = standardSynthetic();
    delete (puzzle.decisionPoints[0]!.evals as Record<string, number>)['a2a3'];
    expect(() => validatePuzzle(puzzle)).toThrow(PuzzleDataError);
    expect(() => validatePuzzle(puzzle)).toThrow(/missing: a2a3/);
  });

  it('rejects an eval table with an illegal extra move', () => {
    const puzzle = standardSynthetic();
    (puzzle.decisionPoints[0]!.evals as Record<string, number>)['e2e5'] = 0;
    expect(() => validatePuzzle(puzzle)).toThrow(/not legal: e2e5/);
  });

  it('rejects a hero move whose SAN and UCI disagree', () => {
    const puzzle = standardSynthetic();
    puzzle.decisionPoints[0]!.hero.san = 'd4';
    expect(() => validatePuzzle(puzzle)).toThrow(/is not SAN/);
  });

  it('rejects a prelude that does not reach startFen', () => {
    const puzzle = standardSynthetic();
    puzzle.startFen = puzzle.startFen.replace(' w ', ' b ');
    expect(() => validatePuzzle(puzzle)).toThrow(/startFen/);
  });

  it('rejects a finale that does not replay', () => {
    const puzzle = standardSynthetic();
    puzzle.finale.san[0] = 'Qh5'; // black to move; a white queen move cannot replay
    expect(() => validatePuzzle(puzzle)).toThrow(/Finale move 1/);
  });

  it('rejects out-of-sequence decision point plies', () => {
    const puzzle = standardSynthetic();
    puzzle.decisionPoints[1]!.ply = 99;
    expect(() => validatePuzzle(puzzle)).toThrow(/out of sequence/);
  });
});
