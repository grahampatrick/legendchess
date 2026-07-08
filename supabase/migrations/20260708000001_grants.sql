-- Explicit table privileges. Hosted Supabase adds default grants for its
-- roles automatically, so production already behaves this way; a from-scratch
-- database (supabase test db in CI) does not. RLS policies still gate every
-- row — these grants only open the table-level door the policies guard.

grant usage on schema public to anon, authenticated;

-- Read-only public surfaces (policies: "... are public").
grant select on public.profiles to anon, authenticated;
grant select on public.results to anon, authenticated;
grant select on public.follows to anon, authenticated;

-- Row-gated writes (policies restrict to auth.uid()).
grant update on public.profiles to authenticated;
grant insert, delete on public.follows to authenticated;

-- results stays service-role-only for writes: no insert/update/delete grants.
