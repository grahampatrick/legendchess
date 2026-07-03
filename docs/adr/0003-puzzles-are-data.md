# ADR 0003 — Puzzles are data, not code

**Status:** Accepted · **Date:** 2026-07-02

## Context

A daily game lives or dies on its content runway. If adding a day's puzzle requires engineering
work, content stalls when engineers are busy — and open-source contributors can't help.

## Decision

A puzzle is one self-contained JSON document conforming to the zod `PuzzleSchema` in
`@playthelegend/core`: metadata (event, year, hero, story blurb, sources), start FEN, prelude
moves, hero decision points with per-legal-move eval tables, opponent replies, and finale moves.
Puzzles are produced by `forge` from a bare PGN plus a small curation config, validated against
the schema, and auto-played through the real session state machine before they may ship.

Historical game scores (bare movetext) are facts and not copyrightable; annotations are — the
pipeline ingests bare moves only and we write our own blurbs.

## Consequences

- Adding content is a config-file PR, never a code change.
- One shared fixture puzzle exercises core, forge, web e2e, and server verification.
- Schema changes require a `schemaVersion` bump and a migration note.
