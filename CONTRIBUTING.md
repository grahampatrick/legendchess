# Contributing

Welcome! The most valuable thing you can contribute is **a famous game** — no
code required. The pipeline turns a bare PGN plus a small config into a
playable daily puzzle.

## Adding a famous game (the good stuff)

1. **Pick a game with a story.** A named hero, a moment (sacrifice, king hunt,
   legendary grind), and a verifiable public source for the bare movetext
   (Wikipedia game articles are ideal — many of our first twenty came from
   there).
2. **Create `games/NNNN-slug/game.pgn`** — headers + bare movetext ONLY.
   Game scores are public-domain facts; annotations are copyrighted, so never
   copy commentary, and write your own blurb.
3. **Create `games/NNNN-slug/curation.json`** — see any existing game dir for
   the shape: hero, color, a `window` of 7–15 of the hero's full-move numbers,
   an original `blurb` (2–4 sentences, second person, set the scene), and
   `sources` for where you verified the moves.
4. **Build and read the lint:**
   ```bash
   STOCKFISH_PATH=$(which stockfish) pnpm forge build games/NNNN-slug
   pnpm forge validate dist/puzzles/NNNN-slug.json
   ```
   ⚠ warnings tell you when a window has only-moves (boring), cheap 🟨s, or a
   hero move far below the engine's best — tune `window` and rebuild.
5. **Open a PR** with the game dir AND the built `dist/puzzles/*.json`
   (built puzzles are frozen artifacts — see `packages/forge/README.md`).

The replay validator will reject any transcription error, and CI re-validates
every puzzle. If the moves replay and the blurb is yours, you're in.

## Code contributions

- Read [plan.md](plan.md) first — every PR is reviewed against its
  **Architectural Non-Negotiables** (no engine in the client, core stays pure,
  one ruleset implementation, anonymous play is sacred).
- `pnpm lint && pnpm typecheck && pnpm test` must be green; UI changes need
  `pnpm --filter @playthelegend/web e2e` too.
- Non-obvious decisions get an ADR in `docs/adr/` in the same PR.
- Scoring/ruleset changes: `RULES` lives in `packages/core/src/rules.ts` and
  is governed by ADR 0004 — update the ADR with the change.

By contributing you agree your work is licensed under GPL-3.0-or-later.
