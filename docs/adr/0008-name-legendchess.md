# ADR 0008 — The name: LegendChess (legendchess.com)

**Status:** Accepted · **Date:** 2026-07-08

## Context

"Play the Legend" was a working title from day one; the plan's open-questions
table required a final name before launch because the share format (ADR 0007)
embeds it and freezes on first public share. Finalists after domain checks:
`legendchess.com` (descriptive, .com trust, keeps the legend-themed copy) and
`immortal.day` (evocative ritual brand, chess-native word, daily TLD).

## Decision

**LegendChess**, on **legendchess.com**. The .com's typing/trust discount and
full copy continuity (the /legends page, "meet the legend", "Next legend in…")
outweigh the poetry of `immortal.day`. The share title line is now
`LegendChess #N — <hero>, <event> <year>` — ratified here as the final
pre-launch share-format change alongside ADR 0007's ♞ signature.

Renames applied repo-wide in one sweep: display name, package scope
(`@legendchess/*`), base error class (`LegendChessError`), localStorage keys
(`legendchess.*` — pre-launch, so losing the two dev players' local history
was accepted), OG image, docs. The on-disk repo directory and local
launch.json entry keep their old names (local tooling paths; no user-visible
surface).

## Consequences

- `immortal.day` remains recommended as a cheap defensive/marketing
  registration (themed "Immortals" collection redirect), not the brand.
- GitHub repo should be published as `legendchess`.
- Supabase/Vercel need no changes for the rename itself.
