# ADR 0007 — The ♞ share-grid signature

**Status:** Accepted · **Date:** 2026-07-03

## Context

The share grid is the product's entire organic distribution (non-negotiable
#8 made its format a public API). In a feed full of Wordle-family grids, an
unmarked emoji row is anonymous — the reader can't tell whose game it came
from without reading the title line, and titles get truncated in previews.

## Decision

The grid line is prefixed with ♞: `♞🟩🟩🟨🟩…`. One glyph, renders everywhere
emoji render, unmistakably chess, and — because no other daily game leads its
grid with a knight — recognizably ours at a glance. Applied in core's
`formatShareText` (the single share-text implementation), snapshot-tested,
and verified from the real clipboard in e2e.

This is the last pre-launch change to the share format. After launch the
format is frozen except by ADR, because recognizability compounds and every
change resets it.

## Consequences

- The UI's on-screen grids (progress + done card) stay unprefixed — the
  signature marks the _exported_ artifact, not the interface.
- The `results.grid` column stores the plain grid (server-computed via
  `emojiGrid`), unaffected.
