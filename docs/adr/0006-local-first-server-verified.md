# ADR 0006 — Local-first play, server-verified competition

**Status:** Accepted · **Date:** 2026-07-03

## Context

Anonymous play is sacred (non-negotiable #4), but a leaderboard invites
cheating, and client-computed scores cannot be trusted (ADR 0005 made the
solution readable on purpose).

## Decision

- **Play is local-first.** Sessions, streaks, and stats live in localStorage.
  No account, no network round-trip, ever, to play the daily.
- **Competition is server-verified.** On finishing the daily, a signed-in
  client submits its raw **action log** (guesses + hints), not a score. The
  submit route replays the log through `@playthelegend/core`'s `createSession`
  — the same code that graded the client and that the tests exercise — and
  computes score/grid/solved itself (`apps/web/src/lib/verify.ts`). One
  ruleset implementation, graded three ways (non-negotiable #5).
- **Database writes go through the verified path only.** RLS allows public
  SELECT on `results` and no INSERT/UPDATE/DELETE for any client role; the
  service-role key writes exclusively from the submit route. `UNIQUE (user_id,
date_key)` makes the first submission final. Only _today's_ daily is
  submittable — archives are for fun.
- **Accounts are additive.** Supabase env vars absent → the account/leaderboard
  surfaces render a friendly "not configured" note and the game is untouched.
- **Migration scope (v1):** signing in after finishing today's daily submits
  today's verified result. Historical local days cannot be verified
  retroactively and stay local; cross-device streak sync is future work, not
  an M5 promise.

## Consequences

- A cheater can decode the seal and type the hero moves — the server cannot
  distinguish knowledge from lookup. What it CAN guarantee: the submitted line
  really finishes the game under the real rules, the score is honestly
  computed from it, nobody submits twice, and nobody edits a score after the
  fact. That's the right bar for a casual daily; timing-based anomaly
  detection can come later if it matters.
- RLS policies are tested with pgTAP (`supabase/tests/database/rls.test.sql`,
  `supabase test db` in CI).
