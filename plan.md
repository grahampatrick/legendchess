# Play the Legend — Compound Engineering Plan

_Working title. Open-source daily chess game: step into the shoes of a legend — Magnus, Kasparov, Fischer, Tal — and find the moves they actually played in their most famous games, with limited attempts. Wordle-style daily cadence, shareable results, mass FOMO._

---

## Current State

| Path            | Status                                                     |
| --------------- | ---------------------------------------------------------- |
| `plan.md`       | This file. The only artifact.                              |
| everything else | Missing — greenfield repo, no code, no specs, no sketches. |

Nothing is working, nothing is scaffolded. Every decision below was made at planning time and is recorded here so implementation doesn't re-litigate it.

**Prior art to study before building (not copy — differentiate):**

- **Chessguessr** — guess a 5-move continuation, Wordle-grid share. Validates the mechanic works virally; UX is spartan.
- **chess.com "Guess the Move"** — proves people love replaying master games; buried inside a paid app, no daily/social loop.
- **lichess.org** — the UI bar we're aiming at, and the source of our component stack.

Our differentiation: you play a _whole famous game_ (a curated window of it) _as a named legend_, with a narrative frame ("London 1993, game 4 — you are Kasparov"), partial credit for engine-equivalent moves, and a daily social loop.

---

## North Star

Every day at 00:00 UTC, anyone in the world can open the site in <2 seconds, play 10–15 moves of a legendary game as its hero with 3 lives and escalating hints, and share an emoji grid that makes their friends need to play it too.

---

## Foundational Decisions (made now, revisit only via ADR)

1. **We do not build a chess engine.** Move legality, FEN/PGN, and board state come from **`chessops`** (lichess's TS rules library). The board UI is **`chessground`** (lichess's actual board — this _is_ the "lichess UI style"). **Stockfish (WASM or native binary) runs only in the offline authoring pipeline**, never in the player's browser.
2. **License: GPL-3.0** for the whole repo. chessground and chessops are GPL-3; fighting that with MIT alternatives (chess.js + a hand-rolled board) costs weeks and looks worse. We're open source anyway — GPL is a feature, it keeps forks open.
3. **Puzzles are data, not code.** The pipeline emits one self-contained `puzzle.json` per day: metadata (event, year, hero, opponent, story blurb), start FEN, the hero's actual moves, opponent replies, and a **precomputed eval table for every legal move at every hero decision point**. The client grades guesses by table lookup — deterministic, offline-capable, no engine shipped.
4. **Game scores are facts, not copyrightable.** Move sequences of historical games are public domain; _annotations_ are not. The pipeline ingests bare moves only. We write our own story blurbs. No player photos/likenesses without a license — names + factual framing only, plus a "not affiliated with or endorsed by" disclaimer.
5. **Stack: pnpm monorepo — `packages/core` (pure TS domain), `packages/forge` (authoring CLI), `apps/web` (Next.js + chessground), Supabase (optional accounts/streaks/leaderboard), Vercel deploy.** Play works fully anonymous + offline-after-load; accounts are additive.
6. **Deterministic daily selection:** puzzle id = f(UTC date) against a published-in-advance content calendar. No server clock games, no timezone drama — same puzzle for everyone, everywhere.

### The core mechanic (v1 ruleset — tune in M1, don't reinvent later)

- You are shown the game up to the window start (auto-replayed with the story blurb), then play as the hero for **10–15 decision points**.
- Per decision point: guess by moving a piece. Each point resolves at a **level**: 3 🟩 · 2 🟨 · 1 🟥 · 0 ⬛. It starts at 3; every **miss** (costs a life, auto-reveals the next hint) and every **voluntary hint** downgrades it one step (floor 1 while guessing). **Exact match** resolves at the current level; **engine-equivalent** (within 30cp of the hero's move, or better) resolves at min(level, 2) and the game continues with the _hero's actual move_ so history stays on rails. _(Refined during M1 — the authoritative spec is ADR 0004.)_
- **3 lives for the whole game.** Out of lives → the current point resolves ⬛, remaining moves auto-play, you finish as a spectator (you still see the masterpiece — never a dead end).
- **Hints** (each downgrades your square one step): 1) which piece moved, 2) destination square, 3) full arrow.
- Score = points per level (100/60/25/0); share grid = one emoji per decision point + lives + day number, e.g. `Play the Legend #37 — Garry Kasparov, Hoogovens Tournament, Wijk aan Zee 1999` / `🟩🟩🟨🟩🟨🟩🟩🟨🟩🟩` / `❤❤ 820/1000`

---

## Milestones

### M0 — Repo skeleton & feedback rails

**Goal:** A contributor can clone, install, and get red/green signal in under 5 minutes.

**Deliverables**

- [x] pnpm workspace: `packages/core`, `packages/forge`, `apps/web` (empty shells with `package.json` + one passing placeholder test each)
- [x] TypeScript strict config shared via `tsconfig.base.json`
- [x] ESLint + Prettier, Vitest wired at workspace root
- [x] GitHub Actions CI: `pnpm lint && pnpm typecheck && pnpm test` on every PR
- [x] `LICENSE` (GPL-3.0), `README.md` (pitch + this plan linked), `CONTRIBUTING.md` stub
- [x] `docs/adr/0001-no-engine-in-client.md`, `0002-gpl-license.md`, `0003-puzzles-are-data.md` (record decisions above)

**CE Principle:** every later milestone lands as a PR against already-running gates — quality is enforced from commit #1, not retrofitted.

**Key pitfalls:** skipping ADRs ("we'll remember") — you won't, and contributors definitely won't; letting `apps/web` skip strict TS "temporarily".

**Definition of Done**

```bash
pnpm install && pnpm lint && pnpm typecheck && pnpm test   # all green locally and in CI
```

---

### M1 — `packages/core`: the game domain, pure and engine-free

**Goal:** The entire ruleset (grading, lives, hints, scoring, share-grid) exists as a pure TS library with one hand-authored real puzzle as fixture.

**Deliverables**

- [x] `PuzzleSchema` (zod): metadata, startFen, decision points, opponent replies, eval tables — this schema is the contract between forge, web, and tests
- [x] `createSession(puzzle)` state machine: `guess(uci) → {result: 'exact'|'equivalent'|'miss', livesLeft, hint?, done}`
- [x] Scoring + emoji share-grid generator (pure function of session history)
- [x] Fixture: `fixtures/puzzles/0001-kasparov-topalov-1999.json` **hand-authored** (evals entered manually from an engine GUI) — the "Kasparov's Immortal" 24.Rxd4 game or similar
- [x] Exhaustive unit tests: exact/equivalent/miss paths, life exhaustion → spectator mode, hint escalation, grid output snapshot
- [x] `docs/adr/0004-scoring-ruleset-v1.md` with the tunable constants (cp threshold, life count, hint costs) in one exported `RULES` object

**CE Principle:** the schema + fixture become the shared test bed for _every_ downstream package — forge must emit it, web must render it, e2e must play it. One fixture, three consumers.

**Key pitfalls:** letting UI concerns leak into core (it must run in Node with zero DOM); hardcoding scoring constants inline instead of the `RULES` object (kills tuning later); fixture with only happy-path moves — include a decision point where 2+ moves are engine-equivalent, and one where the hero's move is _not_ the engine's top choice (Tal games will do this constantly).

**Definition of Done**

```bash
pnpm --filter @playthelegend/core test   # includes full playthrough of fixture 0001 in all 3 outcome paths
pnpm typecheck && pnpm lint
```

---

### M2 — `packages/forge`: PGN → puzzle pipeline

**Goal:** `forge build games/1999-kasparov-topalov.pgn --hero Kasparov --window 20-35` emits a valid puzzle JSON, evals included, in one command.

**Deliverables**

- [x] PGN ingestion via chessops; curation config per game (hero, color, ply window, blurb, sources)
- [x] Stockfish integration (local binary via UCI, depth/time configurable): evaluate **every legal move** at each hero decision point, emit cp table
- [x] Validation gate: every emitted puzzle is loaded by `core`'s schema AND auto-played through `createSession` (exact-path) before it's accepted
- [x] Window auto-lint: warn on forced/only-move sequences (recaptures, checks with one reply) — those are boring guesses; suggest trimming
- [x] `games/` directory with **first 10 curated famous games** (bare PGNs + curation configs). _Shipped (chosen for Wikipedia-verifiable movetext): Kasparov–Topalov 1999, Opera Game 1858, Immortal Game 1851, Evergreen Game 1852, Immortal Zugzwang 1923, Rubinstein's Immortal 1907, Gold Coins Game 1912, Game of the Century 1956, Carlsen–Nepomniachtchi WC2021 g6, Kasparov vs the World 1999. Originally-listed games without a verifiable public movetext source (Tal–Larsen 1965, Seville 1987 g24, Short–Timman 1991, …) move to the M6 content runway with a sourcing step._
- [x] Golden-file tests: fixed PGN + fixed engine depth → byte-identical puzzle JSON (pin Stockfish version in CI via download script)

**CE Principle:** content creation becomes a config-file PR, not an engineering task — after this milestone, adding a puzzle costs ~15 minutes and zero code, and contributors can do it.

**Key pitfalls:** evaluating only the hero's move instead of all legal moves (partial credit becomes impossible); nondeterministic evals (multithreaded SF at low depth varies — pin threads=1, fixed depth or generous fixed nodes); trusting found PGNs blindly (validate every move legally replays; famous games circulate with transcription errors); sourcing PGNs _with annotations_ (copyright — strip to bare movetext).

**Learned in execution:** ① Stockfish silently ignores out-of-range `setoption` values — the engine wrapper introspects declared option bounds from the `uci` handshake, and eval-coverage checks are mandatory. ② chessops encodes castling as king-takes-rook (`e1h1`); the puzzle format standardizes on engine UCI (`e1g1`), converted at core's chess boundary. ③ Fixed-depth MultiPV in mate-heavy positions is pathologically slow (Gold Coins Game: 98 min at depth 16 — every losing move gets searched to full depth). Before the M6 batch, add a per-move node cap or use lower depth for positions where the hero move mates. ④ Built puzzles in `dist/puzzles/` are FROZEN committed artifacts (non-negotiable #6); rebuilding a shipped puzzle requires an ADR.

**Definition of Done**

```bash
pnpm --filter @playthelegend/forge test
pnpm forge build games/*.pgn && pnpm forge validate dist/puzzles/   # 10/10 puzzles pass core validation
```

---

### M3 — `apps/web`: the lichess-feel playable UI

**Goal:** A visitor can play any puzzle JSON end-to-end on desktop and mobile and it _feels like lichess_.

**Deliverables**

- [x] Next.js app; chessground board with drag + click-move, legal-move dests from chessops, last-move + check highlights, sensible piece set/theme (lichess defaults, GPL assets)
- [x] Game flow screens: intro (story blurb, "You are Magnus" framing) → auto-replay to window start → guess loop with lives/hints UI → finale (full game replay, score, grid)
- [x] Board is a thin adapter over `core`'s session — no game rules in React
- [x] Responsive: one-hand mobile play; board ≥ 90vw on phones
- [x] Playwright e2e: plays fixture 0001 through win path and out-of-lives path via the real UI
- [x] Dev route `/play/[puzzleId]` loading from local `dist/puzzles/`

**CE Principle:** e2e tests drive the same fixture as M1's unit tests — a rules change that breaks the UI contract fails in CI before a human ever sees it.

**Key pitfalls:** re-implementing move legality in the UI layer (chessground needs a `dests` map — generate it from chessops, never hand-roll); promotion UI (guess = e8=Q vs e8=N are different guesses — must show the picker); animating opponent replies too fast to follow (the _game_ is the content — let it breathe); desktop-first CSS (this goes viral on phones or not at all).

**Definition of Done**

```bash
pnpm --filter @playthelegend/web test && pnpm --filter @playthelegend/web e2e     # playwright green
pnpm dev   # manual demo: play puzzle 0001 start-to-finish on a phone-width viewport
```

---

### M4 — The daily loop: FOMO machinery

**Goal:** The site has one puzzle per day, streaks, countdown, and a share grid people actually paste.

**Deliverables**

- [x] Daily selection: content calendar file mapping UTC date → puzzle id, published ahead; `/` always serves today's
- [x] localStorage persistence: today's progress (refresh-safe), streak, history, stats (games played, 🟩-rate)
- [x] Share: native share sheet + clipboard fallback, grid format locked and snapshot-tested (it's a public API now)
- [x] Post-game countdown to next puzzle + "yesterday's solution" archive page (past days playable but marked, don't count for streaks)
- [x] Per-day OG image (event, year, hero silhouette-free art, day #) via `@vercel/og`
- [x] Anti-spoiler: solution moves lightly obfuscated in the JSON (XOR/base64 — deters view-source, not determined cheaters; ADR why that's enough for anonymous play)

**CE Principle:** the calendar + archive turn every M2 content PR into a scheduled asset — the content runway and the product decouple; shipping code and shipping puzzles are independent pipelines.

**Key pitfalls:** timezone bugs (test date rollover explicitly — Wordle's most infamous failure); streak logic across missed days (missed day = streak reset, but _today unfinished_ ≠ missed); share grid churn (every format change breaks recognizability in group chats — snapshot-test it); localStorage schema without a version field (you will migrate it, plan for that now).

**Definition of Done**

```bash
pnpm --filter @playthelegend/web test   # includes date-rollover + streak unit tests (mocked clock)
pnpm --filter @playthelegend/web e2e    # includes: finish game → share text matches snapshot → countdown visible
```

---

### M5 — Accounts, leaderboard, verified streaks (Supabase)

**Goal:** Optional sign-in syncs streaks across devices and adds a daily/friends leaderboard without touching anonymous play.

**Deliverables**

- [ ] Supabase auth (magic link + OAuth); anonymous → account migration of local stats
- [ ] Server-verified results for leaderboard: submit guess sequence, server replays it against the puzzle and computes score (client score is advisory; leaderboard trusts only server)
- [ ] Daily leaderboard + friends (follow by handle); RLS policies tested
- [ ] Rate limiting on submission; one result per user per day, first submission final
- [ ] ADR: local-first play, server-verified competition

**CE Principle:** verification reuses `core`'s `createSession` server-side — one ruleset implementation graded three ways (client, tests, server); a rules bug can't create a client/server fork.

**Key pitfalls:** making auth mandatory anywhere in the daily loop (kills virality dead); trusting client-computed scores on the leaderboard; RLS as an afterthought (write the policy tests with the schema, not after).

**Definition of Done**

```bash
pnpm --filter @playthelegend/web test && pnpm --filter @playthelegend/web e2e   # incl. auth-mocked submit path
supabase test db          # RLS policy tests green
```

---

### M6 — Launch runway

**Goal:** 60+ days of content, open-source front door, and launch-day distribution ready.

**Deliverables**

- [ ] 60-puzzle content calendar (M2 pipeline; themed weeks: World Championship week, Immortal Games week, Magnus week…)
- [ ] README with hero GIF, CONTRIBUTING with "add a famous game" guide (the community becomes the content pipeline), issue templates, good-first-issues
- [ ] Privacy-respecting analytics (Plausible/Umami): completion rate, share rate, D1/D7 retention funnels
- [ ] Domain + name finalized, OG/social cards, launch posts drafted (r/chess, HN Show, chess Twitter/YT outreach list)
- [ ] Error tracking (Sentry) + uptime check on `/api/today`

**CE Principle:** the "add a game" contributor guide converts open-source attention (launch spike) into a self-sustaining content flywheel — the launch _feeds_ the runway.

**Key pitfalls:** launching with <30 days of content (a daily game that misses a day loses all FOMO credibility); analytics that can't answer "do sharers convert friends?"; ignoring r/chess norms (self-promo rules — seed via "I built this" story, not ads).

**Definition of Done**

```bash
pnpm forge validate dist/puzzles/   # ≥60 puzzles pass
pnpm build && pnpm e2e              # production build green
# manual: play today's puzzle on production URL from a phone, share to an actual group chat
```

---

## Open Questions

| Question                                                       | Owner            | Resolution Path                                                                                                                                                                                                                         |
| -------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name + domain ("Play the Legend" is a placeholder)             | gm               | Shortlist 5 by end of M1; check domains + npm/GitHub collisions; pick before M4 (share grid embeds the name — locked after launch)                                                                                                      |
| Engine-equivalence threshold (30cp? scaled by eval magnitude?) | gm + playtesting | Ship v1 constant in `RULES`; playtest 10 people on 3 puzzles during M3; tune once before launch; ADR the final value                                                                                                                    |
| Lives: 3 per game vs N per move                                | gm               | Prototype both in core (cheap — it's one state machine flag) during M1; decide via M3 playtests                                                                                                                                         |
| Living players' names (Magnus, etc.) — publicity-rights risk?  | gm               | Factual/editorial use of names + no likeness imagery + disclaimer is the standard posture (Chessguessr, books, databases all do this). Add disclaimer in M4 footer; if the project gets big, get a real opinion then. Don't block on it |
| Hard daily puzzle vs difficulty tiers                          | gm               | Launch with one puzzle/day (FOMO needs a single shared experience). Revisit tiers post-launch only if analytics show completion <40%                                                                                                    |
| Stockfish in CI: download vs vendor                            | implementer      | M2: pin version via checksummed download script in CI; golden tests catch drift. Revisit if flaky                                                                                                                                       |
| Monetization                                                   | gm               | None at launch (open source, viral first). Decide post-traction; nothing in the architecture may assume it                                                                                                                              |

---

## Architectural Non-Negotiables

Every PR is reviewed against these:

1. **No engine in the client.** Grading is table lookup from puzzle JSON. If a feature "needs" client-side Stockfish, redesign the feature.
2. **`packages/core` stays pure.** No DOM, no React, no network, no Date.now() (clock injected). It must run identically in browser, Node tests, and server verification.
3. **Puzzles are data.** Adding content never requires a code change. Schema changes require a zod version bump + migration note.
4. **Anonymous play is sacred.** No feature may put auth, network round-trips (after initial load), or accounts between a visitor and finishing today's puzzle.
5. **One ruleset implementation.** Client, tests, and server all grade through `core`. Never reimplement scoring anywhere.
6. **Deterministic dailies.** Same UTC date → same puzzle → same evals, for everyone, forever (archive replays depend on it).
7. **GPL-3 hygiene.** Dependencies must be GPL-compatible; asset licenses recorded in `docs/licenses.md`.
8. **Share-grid format is a public API.** Changes require snapshot-test update + explicit ADR.

---

## CE Feedback Loops

- **CI gates from M0:** lint, typecheck, unit, e2e — no milestone merges without the previous milestone's gates still green.
- **Shared fixtures:** `fixtures/puzzles/0001-*.json` is consumed by core unit tests, forge validation tests, web e2e, and server verification tests. One fixture edit exercises the whole stack.
- **Forge validation gate:** no puzzle reaches `dist/` without schema-validating AND auto-playing through the real session machine — content bugs die in the pipeline, not on launch day.
- **ADRs at decision time:** `docs/adr/` — decisions above are ADRs 0001–0004; every non-negotiable exception or open-question resolution becomes a numbered ADR in the same PR that implements it.
- **Demo per milestone:** each milestone ends with a runnable demo (commands in its DoD); M3+ demos are recorded (GIF in PR description) — the GIFs become README/launch assets, so demo effort compounds into marketing.
- **Golden files for the pipeline:** pinned engine + pinned PGN → byte-identical output; eval drift (engine upgrades) surfaces as a reviewed diff, not silent puzzle changes.
- **Snapshot-tested share grid:** the most valuable byte-string in the product can't change by accident.

---

## What to Do First

1. `pnpm init` the workspace; commit M0 skeleton (packages, tsconfig, lint, vitest, CI workflow) — get CI green on the placeholder tests.
2. Write ADRs 0001–0003 (no-engine-in-client, GPL-3, puzzles-are-data) — 15 minutes, copy the decisions from this plan.
3. Define `PuzzleSchema` in `packages/core` with zod, and hand-author fixture 0001 (Kasparov–Topalov 1999, window ~moves 20–30, evals from any engine GUI). This is the highest-leverage artifact in the repo.
4. Build `createSession` + tests against the fixture (M1 DoD green).
5. Only then start forge (M2). Resist starting the UI first — the fixture + core make the UI a one-week adapter instead of the place where rules get invented.

---

_Update this file when decisions change._
