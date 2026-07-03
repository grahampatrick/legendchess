# ADR 0005 — Anti-spoiler obfuscation is deterrence, not security

**Status:** Accepted · **Date:** 2026-07-03

## Context

The daily puzzle's payload necessarily contains the solution (grading is a
client-side table lookup, ADR 0001). Anyone can open devtools and read it. Do
we need to prevent that?

## Decision

No. The payload's solution-bearing parts (decision points with eval tables,
finale) are XOR-scrambled + base64-encoded (`apps/web/src/lib/seal.ts`) so the
answer never appears in view-source or the network tab as readable SAN — and
that is the entire goal. A player motivated enough to decode a documented,
keyed-in-the-open XOR in an open-source repo is not going to be stopped by
anything short of moving grading server-side, which would break offline play
and the <2s load (non-negotiables #1 and #4).

Anonymous play is honor-system, like Wordle. **Competitive integrity is M5's
job**: leaderboard entries are verified by replaying the submitted guess
sequence server-side against the same core session. Cheaters can fake their
own emoji grid today; they will not be able to fake a leaderboard row.

Meta, prelude, and startFen stay cleartext — OG tags, the intro screen, and
board setup need them, and none of them spoil the window.

## Consequences

- Zero added latency; the seal round-trip is unit-tested against fixture 0001.
- If the honor system visibly fails post-launch (grid-faking becomes a meme),
  the escalation path is per-ply solution fetch from an API route — an ADR and
  a day of work, not a redesign.
