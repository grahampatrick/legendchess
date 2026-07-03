# Shared puzzle fixtures

These files are the repo's shared test bed (see plan.md, "CE Feedback Loops"): core unit
tests, forge validation tests, web e2e, and server verification all consume the same JSON
documents. Every file must pass `validatePuzzle` from `@playthelegend/core` — schema shape
plus full replay integrity (prelude → startFen, eval coverage of every legal move, SAN/UCI
agreement, finale replay).

| File                                      | Game                                                        | Notes                                                                                                                                  |
| ----------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `puzzles/0001-kasparov-topalov-1999.json` | Kasparov–Topalov, Wijk aan Zee 1999 ("Kasparov's Immortal") | Evals: Stockfish 18, depth 18, MultiPV. Authored by `packages/core/scripts/gen-fixture-0001.mjs`; movetext verified against Wikipedia. |

Do not edit eval tables by hand — regenerate with the authoring script (M1) or forge (M2+).
