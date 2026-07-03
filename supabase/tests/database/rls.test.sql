-- RLS policy tests (pgTAP). Run with: supabase test db
begin;
select plan(11);

-- Seed two users directly in auth (triggers provision profiles).
-- Distinct uuid prefixes: the placeholder handle derives from the first 12 hex chars.
insert into auth.users (id, email)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bob@test.local');

select is(
  (select count(*)::int from public.profiles),
  2,
  'signup trigger provisions profiles'
);

-- Seed one verified result as the service role (bypasses RLS by design).
insert into public.results
  (user_id, date_key, day_number, puzzle_id, actions, score, grid, lives_left, solved)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '2026-07-03', 1,
   '0001-kasparov-topalov-1999', '[]'::jsonb, 1000, '🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩', 3, true);

-- ---- anonymous ----
set local role anon;

select is((select count(*)::int from public.profiles), 2, 'anon can read profiles');
select is((select count(*)::int from public.results), 1, 'anon can read the leaderboard');
select throws_ok(
  $$insert into public.results
      (user_id, date_key, day_number, puzzle_id, actions, score, grid, lives_left, solved)
    values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-07-04', 2, 'x', '[]', 9999, '🟩', 3, true)$$,
  '42501',
  null,
  'anon cannot insert results'
);

-- ---- authenticated as alice ----
set local role authenticated;
set local request.jwt.claims to '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$insert into public.results
      (user_id, date_key, day_number, puzzle_id, actions, score, grid, lives_left, solved)
    values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-07-04', 2, 'x', '[]', 9999, '🟩', 3, true)$$,
  '42501',
  null,
  'authenticated users cannot insert results — only the verified server path writes'
);
select throws_ok(
  $$update public.results set score = 9999$$,
  '42501',
  null,
  'scores cannot be tampered with after the fact'
);
select lives_ok(
  $$update public.profiles set handle = 'alice_rocks'
    where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'alice can rename herself'
);

-- Cross-user rename: under RLS this silently affects 0 rows — assert the no-op.
update public.profiles set handle = 'gotcha' where id = 'bbbbbbbb-0000-0000-0000-000000000002';
select is(
  (select handle from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'player_bbbbbbbb0000',
  'RLS made the cross-user rename a no-op'
);
select is(
  (select handle from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'alice_rocks',
  'own rename stuck'
);

select lives_ok(
  $$insert into public.follows (follower, followee)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002')$$,
  'alice can follow bob'
);
select throws_ok(
  $$insert into public.follows (follower, followee)
    values ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'alice cannot create follows on behalf of bob'
);

select * from finish();
rollback;
