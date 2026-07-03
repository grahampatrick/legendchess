# ADR 0001 — No chess engine in the client

**Status:** Accepted · **Date:** 2026-07-02

## Context

The game grades a player's guess against the move a legend actually played, with partial
credit for moves an engine considers equally good. That requires engine evaluations. Running
Stockfish (WASM) in the browser would add megabytes to the bundle, burn mobile battery, produce
nondeterministic evals across devices, and make daily results non-comparable between players.

## Decision

Stockfish runs **only** in the offline authoring pipeline (`@playthelegend/forge`). At authoring
time, forge evaluates **every legal move** at every hero decision point and embeds the resulting
centipawn table in the puzzle JSON. The client grades guesses by table lookup via
`@playthelegend/core`. Move legality and board state come from `chessops` (rules library, no
search). The board UI is `chessground`.

## Consequences

- Same guess → same grade for every player on every device, forever (archive replay depends on this).
- Client stays small and offline-capable after initial load.
- Puzzles are fully self-contained data; a rules change never re-evaluates history.
- If a feature appears to need client-side search, the feature must be redesigned (see
  Architectural Non-Negotiables in `plan.md`).
