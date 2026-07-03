# Launch post drafts

## r/chess — "I built this" (post day 2–3 of soft launch)

**Title:** I built a free daily game where you play the legendary games AS the
legend — today you're Kasparov at Wijk aan Zee 1999

**Body:**

For the last while I've been building an open-source daily chess game and I'd
love this sub's honest opinion.

The idea: every day there's one famous game — Kasparov's Immortal, the Opera
Game, Fischer's Game of the Century, Carlsen's Qh6+!! tiebreak — and you play
it from the hero's side. The game auto-replays to the critical moment, then
you have to find the moves they actually found, with 3 lives and escalating
hints. Stockfish evals for every legal move are precomputed, so if your move
is engine-equal to the hero's you get partial credit (🟨) — but only the
legend's exact move earns the 🟩.

Same puzzle for everyone worldwide, Wordle-style share grid, streaks, archive.
No account needed, no ads, fully open source (GPL — it's built on lichess's
own chessground/chessops).

Things I'd genuinely like feedback on: the 30-centipawn "equivalent move"
threshold, window choices (too forcing? too loose?), and which games you'd
want next — adding a game is literally a config-file PR.

[link] · [github link]

## Show HN

**Title:** Show HN: Play chess as Kasparov, Fischer or Carlsen – a daily
open-source guessing game

**Body:**

Every day, one legendary chess game; you play it from the legend's side and
have to find their actual moves (3 lives, escalating hints, Wordle-style
share grid).

Technically the fun parts were:

- No engine in the client: the authoring pipeline evaluates EVERY legal move
  at each decision point offline (Stockfish 18, MultiPV), so grading is a
  table lookup — deterministic, offline-capable, ~13KB of puzzle JSON.
- One ruleset implementation graded three ways: browser, tests, and a
  server-side leaderboard verifier that replays your raw action log rather
  than trusting a score.
- Move sequences of historical games are facts (not copyrightable), so the
  content pipeline ingests bare movetext verified against public sources, and
  adding a game is a config-file PR.
- Learned the hard way that Stockfish silently ignores out-of-range setoption
  values, and that fixed-depth MultiPV in mate-heavy positions searches every
  losing move to full depth (one puzzle took 98 minutes to build until we
  added a node cap).

Monorepo: TS core (pure rules), authoring CLI, Next.js app on lichess's
chessground. GPL-3. [link] [github]

## X/Twitter thread opener

Day 1 of [name]: you are Garry Kasparov, Wijk aan Zee 1999. Topalov just
offered a queen trade. You have 3 lives to find the ten moves of the greatest
combination ever played. 🟩🟩🟨🟩🟩🟥🟩🟩🟨🟩 — can you beat my grid? [link]

## Outreach list (friendly, no spam — one personal note each)

- GothamChess (Levy) — loves "guess the move" formats
- agadmator — historical games are his whole channel
- chess.com/lichess community managers (lichess especially — we ship their board)
- ChessNetwork, Eric Rosen (viewer-participation formats)
- The Chess Nerd / chess TikTok — share-grid screenshots do numbers there
