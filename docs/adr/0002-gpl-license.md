# ADR 0002 — GPL-3.0 for the whole repository

**Status:** Accepted · **Date:** 2026-07-02

## Context

The product goal is "lichess-style UI". Lichess's own building blocks — `chessground` (board UI)
and `chessops` (rules/PGN/FEN) — are the fastest, most battle-tested way to get there, and both
are GPL-3.0. MIT alternatives (chess.js + a hand-rolled or react-chessboard UI) would cost weeks
and land below the lichess quality bar.

## Decision

The entire repository is licensed **GPL-3.0-or-later**. We embrace the lichess ecosystem:
`chessground`, `chessops`, and Stockfish (GPL) in the pipeline.

## Consequences

- Forks and derivatives must stay open source — a feature for a community-driven game.
- All dependencies must be GPL-compatible; asset licenses are recorded in `docs/licenses.md`
  as they are added.
- Contributors license their contributions under GPL-3.0-or-later (inbound = outbound).
