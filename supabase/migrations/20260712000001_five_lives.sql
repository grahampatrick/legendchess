-- Ruleset v1.1: five lives (was three) after playtest feedback.
-- RULES.lives in @legendchess/core is the source of truth; this widens the
-- verification-table constraint to match.
alter table public.results drop constraint results_lives_left_check;
alter table public.results add constraint results_lives_left_check
  check (lives_left between 0 and 5);
