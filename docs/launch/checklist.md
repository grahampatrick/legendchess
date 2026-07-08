# Launch checklist

Everything the repo can't do for itself — accounts, money, and the publish
button. In rough order:

## Blocking (do before announcing)

- [ ] **Decide the name** (shortlist below) — it's baked into the share grid
      (`packages/core/src/score.ts`, snapshot-tested) and the OG card. This is
      the LAST cheap moment to change it; after launch it's recognizable-grid
      territory (non-negotiable #8).
- [ ] Buy the domain; set it in `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` too.
- [ ] Publish the repo to GitHub (`gh repo create`, push `main`). CI goes
      green: lint/typecheck/unit/e2e + golden (pinned SF18) + `supabase test db`
      (first real run of the pgTAP suite — watch it).
- [ ] Create the Supabase project; run migrations (`supabase db push`); set
      `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY` in Vercel. Verify: sign in, finish a daily,
      row appears in `results` with server-computed score.
- [ ] Deploy to Vercel (root `apps/web`; `dist/puzzles` + `content/` ship with
      the repo). Smoke-test `/api/today` on production.
- [ ] Point an uptime monitor at `/api/today` (UptimeRobot/BetterStack).
- [ ] Set the calendar's real day-1 date (`scripts/gen-calendar.mjs` START) so
      launch day = day #1, and regenerate. Verify ≥30 days of runway.
- [ ] Play the whole daily on a real phone, share to a real group chat.

## Strongly recommended

- [ ] Plausible site + goals for `game_start`, `game_complete`, `share_click`,
      `hint_used` (funnels: start→complete = completion rate,
      complete→share = share rate; retention via returning-visitor cohorts).
- [ ] Error tracking: create a Sentry project and add `@sentry/nextjs` via its
      wizard (kept out of the repo until there's a DSN to configure).
- [ ] Seed 3–5 "good first issue" game suggestions from
      `docs/launch/runway-candidates.md` so launch-day visitors find the
      contribution path immediately.

## Name shortlist (working title: "LegendChess")

| Name          | Feel              | Share-grid line         |
| ------------- | ----------------- | ----------------------- |
| LegendChess   | on-the-nose, warm | `LegendChess #37 — …`   |
| Legends Daily | wordle-family     | `Legends Daily #37 — …` |
| GrandmasterMe | cheeky            | `GrandmasterMe #37 — …` |
| The Hero Move | evocative         | `The Hero Move #37 — …` |
| Immortal      | one word, huge    | `Immortal #37 — …`      |

Check `.com`/`.gg` + social handles before falling in love. One-line change in
`formatShareText` + snapshot updates + OG title.

## Launch sequence (see launch-posts.md for drafts)

1. Soft-launch to friends/club for 3–4 days (watch completion rate; tune
   `RULES.cpEquivalenceThreshold` if <40% finish).
2. r/chess "I built this" post, morning US time — engage all day in comments.
3. Show HN the following day (link + honest technical writeup).
4. Chess Twitter/X thread with the share-grid screenshot; tag friendly chess
   creators (see outreach list in launch-posts.md).
