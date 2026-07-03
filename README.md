# Play the Legend

_Working title._ An open-source daily chess game: step into the shoes of a legend — Magnus,
Kasparov, Fischer, Tal — and find the moves they actually played in their most famous games.
Three lives, escalating hints, partial credit when the engine says your move was just as good,
and a Wordle-style share grid. One puzzle a day, same for everyone on Earth.

**Status: pre-launch, under active development.** The full plan lives in [plan.md](plan.md).

## How it plays

1. The scene is set: _"Wijk aan Zee, 1999. You are Garry Kasparov."_ The game auto-replays to
   the critical moment.
2. You play the hero's next 10–15 moves. Exact move → 🟩. A move the engine rates just as
   good → 🟨 (the real game continues on rails). Miss → 🟥, lose a life, get a hint, retry.
3. Out of lives? You watch the masterpiece finish as a spectator.
4. Share your grid. Come back tomorrow.

## Repository layout

| Path             | What it is                                                                    |
| ---------------- | ----------------------------------------------------------------------------- |
| `packages/core`  | Pure TS game domain: puzzle schema, grading, lives/hints, scoring, share grid |
| `packages/forge` | Authoring pipeline: PGN + config → validated puzzle JSON with Stockfish evals |
| `apps/web`       | Next.js app: chessground board, daily loop, share                             |
| `fixtures/`      | Shared puzzle fixtures used by every package's tests                          |
| `docs/adr/`      | Architecture decision records                                                 |

## Development

Prerequisites: Node ≥ 22, pnpm ≥ 9.

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test
```

## License

[GPL-3.0-or-later](LICENSE) — see [ADR 0002](docs/adr/0002-gpl-license.md).

Not affiliated with or endorsed by any chess player, federation, or lichess.org.
Historical game scores are facts in the public domain; all story blurbs are original.
