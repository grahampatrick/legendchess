# ADR 0004 — Scoring ruleset v1

**Status:** Accepted · **Date:** 2026-07-02

## Context

The plan sketched the mechanic (lives, hints, partial credit) but left the exact interaction
of misses, hints, and square colors underspecified — e.g. its sample share grid showed a 🟥
after a single lost life, while also saying a miss lets you retry. Implementation forced the
ambiguity out.

## Decision — the v1 ruleset (implemented once, in `@playthelegend/core`)

Every decision point resolves at a **level**: 3 🟩 · 2 🟨 · 1 🟥 · 0 ⬛.

- A point starts at level 3. **Every downgrade is one step, floored at level 1** while you're
  still guessing. Downgrades are: a **miss** (also costs one of 3 global lives and
  auto-reveals the next hint tier) and a **voluntary hint** (no life cost).
- Hint tiers escalate 1 → 2 → 3 across both sources: ① which piece moves, ② destination
  square, ③ the full move.
- **Exact** hero move → resolves at the current level. **Equivalent** move (eval within
  `cpEquivalenceThreshold` = 30cp of the hero move's eval, from the hero's perspective;
  better-than-hero always counts) → resolves at `min(level, 2)`, and the _actual_ game move
  is played so history stays on rails.
- **Third miss** → the current point resolves `failed` (level 0), the session enters
  **spectator** phase, unreached points stay unresolved (⬛), and the UI replays the rest.
- Points per level: 100 / 60 / 25 / 0. Illegal or malformed input throws and costs nothing.

So: one miss then solving = 🟨 (same as an equivalent first try); 🟥 means you needed two
downgrades. This supersedes the plan's illustrative grid.

All constants live in the exported `RULES` object (`packages/core/src/rules.ts`) — tuning is
a one-line change plus playtests (M3), never a logic change.

## Consequences

- Client, tests, and server verification share this single implementation (non-negotiable #5).
- The share grid encodes effort honestly: hints and misses are indistinguishable in the emoji
  (both are "you needed help"), which keeps sharing shame-free.
- Threshold and points values are explicitly provisional until the M3 playtests; changing them
  requires updating this ADR.
