# Launch checklist

Everything the repo can't do for itself — accounts, money, and the publish
button. In rough order:

## Blocking (do before announcing)

- [x] **Decide the name** — LegendChess (ADR 0008), rename sweep 2026-07-08.
- [x] Buy the domain — legendchess.com (Namecheap), attached to Vercel + DNS set 2026-07-09.
- [x] Publish the repo to GitHub — github.com/grahampatrick/legendchess (PRIVATE; flip public at launch). CI fully green on Linux 2026-07-08 incl. golden + pgTAP.
- [x] Create the Supabase project — done + verified end-to-end 2026-07-07 (sign-in, verified result, leaderboard). Env vars in Vercel. NOTE: Redirect URLs allowlist entry still not matching; harmless (AuthSessionSync), retry during a quiet moment.
- [x] Deploy to Vercel — live at legendchess.vercel.app 2026-07-09; domain attached; /api/today + all pages 200. (Gotchas fixed: pnpm 11 allowBuilds; git author must be team-associated; CLI uploads hang from this machine — use the git deploy hook.)
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
