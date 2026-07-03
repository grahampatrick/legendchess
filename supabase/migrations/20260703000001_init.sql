-- Play the Legend — accounts, verified results, follows (M5).
-- Design (ADR 0006): anonymous play never touches this database. Results are
-- written ONLY by the server after replaying the submitted action log through
-- the core ruleset — clients cannot insert or mutate rows.

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are public"
  on public.profiles for select
  using (true);

create policy "users update their own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Auto-provision a profile with a placeholder handle on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, handle)
  values (new.id, 'player_' || substr(replace(new.id::text, '-', ''), 1, 12));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------- results
create table public.results (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  date_key date not null,
  day_number int not null,
  puzzle_id text not null,
  -- The submitted action log, kept for audit/re-verification.
  actions jsonb not null,
  -- Server-computed via the core ruleset; never trusted from the client.
  score int not null,
  grid text not null,
  lives_left int not null check (lives_left between 0 and 3),
  solved boolean not null,
  created_at timestamptz not null default now(),
  -- One result per player per day; first submission is final.
  unique (user_id, date_key)
);

create index results_by_day on public.results (date_key, score desc, created_at asc);

alter table public.results enable row level security;

create policy "results are public (it's a leaderboard)"
  on public.results for select
  using (true);

-- No insert/update/delete policies: only the service role (which bypasses
-- RLS) may write, and it does so exclusively from the verified submit route.

-- ----------------------------------------------------------------- follows
create table public.follows (
  follower uuid not null references public.profiles (id) on delete cascade,
  followee uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);

alter table public.follows enable row level security;

create policy "follows are public"
  on public.follows for select
  using (true);

create policy "users manage their own follows"
  on public.follows for insert
  with check ((select auth.uid()) = follower);

create policy "users remove their own follows"
  on public.follows for delete
  using ((select auth.uid()) = follower);
