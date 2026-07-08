/**
 * Anti-spoiler obfuscation (ADR 0005): the solution-bearing parts of a puzzle
 * (decision points, finale) are XOR-scrambled and base64-encoded in the
 * payload the server sends to the client. This deters view-source and network
 * tab spoilers; it is deliberately NOT security — competitive integrity comes
 * from server-side verification in M5.
 */
import { PuzzleSchema, validatePuzzle, type Puzzle } from '@legendchess/core';
import { z } from 'zod';

const XOR_KEY = 'the-legend-plays-first';

const xorString = (input: string): string => {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    out += String.fromCharCode(input.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length));
  }
  return out;
};

const toBase64 = (s: string): string =>
  typeof window === 'undefined' ? Buffer.from(s, 'binary').toString('base64') : window.btoa(s);

const fromBase64 = (s: string): string =>
  typeof window === 'undefined' ? Buffer.from(s, 'base64').toString('binary') : window.atob(s);

export const SealedPuzzleSchema = z.object({
  sealedVersion: z.literal(1),
  id: PuzzleSchema.shape.id,
  meta: PuzzleSchema.shape.meta,
  prelude: PuzzleSchema.shape.prelude,
  startFen: PuzzleSchema.shape.startFen,
  /** Number of decision points — needed for the empty progress grid. */
  pointCount: z.number().int().positive(),
  blob: z.string(),
});

export type SealedPuzzle = z.infer<typeof SealedPuzzleSchema>;

export const sealPuzzle = (puzzle: Puzzle): SealedPuzzle => ({
  sealedVersion: 1,
  id: puzzle.id,
  meta: puzzle.meta,
  prelude: puzzle.prelude,
  startFen: puzzle.startFen,
  pointCount: puzzle.decisionPoints.length,
  blob: toBase64(
    xorString(
      // encodeURIComponent keeps the XOR input within single-byte code points.
      encodeURIComponent(
        JSON.stringify({ decisionPoints: puzzle.decisionPoints, finale: puzzle.finale }),
      ),
    ),
  ),
});

export const unsealPuzzle = (sealed: SealedPuzzle): Puzzle => {
  const { decisionPoints, finale } = JSON.parse(
    decodeURIComponent(xorString(fromBase64(sealed.blob))),
  ) as Pick<Puzzle, 'decisionPoints' | 'finale'>;
  return validatePuzzle({
    schemaVersion: 1,
    id: sealed.id,
    meta: sealed.meta,
    prelude: sealed.prelude,
    startFen: sealed.startFen,
    decisionPoints,
    finale,
  });
};
