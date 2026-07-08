# @legendchess/forge

The authoring pipeline: bare PGN + a small curation config in, a validated,
self-contained puzzle JSON with Stockfish eval tables out (ADR 0003). Adding a
day of content is a config-file PR, never a code change.

## Adding a famous game

Create `games/NNNN-slug/` with two files:

**`game.pgn`** — headers + bare movetext only. No annotations, no comments, no
variations (game scores are public-domain facts; annotations are copyrighted).
Record where you sourced/verified the moves in the config's `sources`.

**`curation.json`**:

```json
{
  "id": "0002-morphy-opera-1858",
  "title": "The Opera Game",
  "heroName": "Paul Morphy",
  "heroColor": "white",
  "window": { "fromMove": 9, "toMove": 17 },
  "blurb": "Original editorial framing — write your own, never copy.",
  "sources": ["https://en.wikipedia.org/wiki/Opera_Game"],
  "overrides": { "opponentName": "Duke of Brunswick & Count Isouard" }
}
```

`window` is in the hero's own full-move numbers, inclusive. 7–15 decision
points is the sweet spot.

## Build and validate

```bash
pnpm forge build games/0002-morphy-opera-1858 --depth 16 --threads 12
pnpm forge validate dist/puzzles/
```

`STOCKFISH_PATH` overrides the engine binary (default: `stockfish` on PATH).
The build evaluates **every legal move** at each decision point (MultiPV),
checks the eval table covers the legal moves exactly, replays the whole game
for integrity, and auto-plays the exact path through the real session machine.
A puzzle that ships has passed all three.

Watch the ⚠ lint output: only-moves, near-forced points, hero moves far below
the engine's best, and points where 🟨 partial credit is too cheap are flagged
so you can tune the window.

## Determinism and artifacts

- **Golden test** (`test/golden.test.ts`): pinned engine (Stockfish 18), depth
  8, `Threads=1` → byte-identical output, in CI via
  `scripts/ci/install-stockfish.sh`. Engine upgrades surface as a reviewed
  golden diff, never as silent eval drift.
- **Built puzzles are frozen artifacts.** Production builds (depth 16,
  threads > 1) are NOT reproducible run-to-run — that's fine, because a built
  puzzle is committed once and never regenerated casually (non-negotiable #6:
  same date → same puzzle → same evals, forever). Rebuilding an already-shipped
  puzzle requires an ADR.
- Engines lie quietly: Stockfish ignores out-of-range `setoption` values, so
  the wrapper reads each option's declared bounds from the `uci` handshake and
  the build refuses eval tables that don't cover the legal moves exactly.
