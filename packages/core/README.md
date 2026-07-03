# @playthelegend/core

The pure game domain: puzzle schema, guess grading, lives, hints, scoring, and the share
grid. No DOM, no network, no clock, no engine — it runs identically in the browser, in Node
tests, and in server-side verification. This is the **only** implementation of the ruleset
(ADR 0004); `chess.ts` is the only file allowed to import `chessops`.

## Usage

```ts
import { createSession, formatShareText, validatePuzzle } from '@playthelegend/core';

const puzzle = validatePuzzle(JSON.parse(json)); // zod shape + full replay integrity

const session = createSession(puzzle);
session.legalMoves(); // UCI strings → chessground dests
const outcome = session.guess('d1d4');
// { result: 'exact' | 'equivalent' | 'miss', livesLeft, hint?, done }

session.requestHint(); // { tier: 1, piece: 'rook' } — downgrades the square

const state = session.state(); // { phase, livesLeft, currentIndex, fen, records }
formatShareText({ puzzle, state, dayNumber: 37 });
// Play the Legend #37 — Garry Kasparov, Hoogovens Tournament, Wijk aan Zee 1999
// 🟩🟩🟨🟩🟩🟩🟩🟨🟩🟩
// ❤❤ 820/1000
```

Grading is a table lookup against the puzzle's precomputed evals (ADR 0001): the exact hero
move is 🟩; a move within `RULES.cpEquivalenceThreshold` (30cp) of the hero move — or better —
is 🟨 and the real game continues; anything else costs a life.

## Errors

All errors extend `PlayTheLegendError`: `MalformedUciError`, `IllegalMoveError`,
`SessionCompleteError`, `NoMoreHintsError`, `PuzzleDataError`.

## Fixtures

`fixtures/puzzles/` at the repo root is the shared test bed — core unit tests, forge
validation, web e2e, and server verification all consume the same files.
`scripts/gen-fixture-0001.mjs` records how fixture 0001's eval tables were authored
(superseded by forge in M2).
