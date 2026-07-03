# @playthelegend/web

The playable app: Next.js + chessground (lichess's own board — GPL, like the
rest of the repo, see ADR 0002). A thin adapter over `@playthelegend/core`: no
game rules live here (non-negotiable #5); legality flows in as a dests map,
guesses flow out as UCI strings.

## Run it

```bash
pnpm --filter @playthelegend/web dev    # http://localhost:3105
```

`/` lists the frozen puzzles from `dist/puzzles/`; `/play/[puzzleId]` is the
game. The daily loop arrives in M4.

## Flow

intro (blurb, "You are Kasparov") → prelude auto-replay (skippable) → guess
loop (drag, click-click, or typed UCI; hearts, hints, promotion picker) →
reveal animation per resolved point → finale/spectator playback → score card
with the share grid.

Board interaction is `components/Board.tsx` (the only chessground touchpoint);
game sequencing is `components/PlayView.tsx`; frame building for animations is
pure code in `lib/timeline.ts`, unit-tested against fixture 0001.

## Tests

```bash
pnpm --filter @playthelegend/web test   # vitest: pure libs (timeline, dests)
pnpm --filter @playthelegend/web e2e    # playwright: win path, out-of-lives,
                                        # illegal input, click-move, hints —
                                        # desktop + mobile viewports
```

The e2e suite drives the same shared fixture (0001) as core's unit tests and
forge's golden test — one puzzle, four consumers.
