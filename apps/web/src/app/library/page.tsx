import Link from 'next/link';

import { loadCalendar } from '../../lib/calendar.server';
import { entryForNow } from '../../lib/daily';
import { loadPuzzle } from '../../lib/puzzles.server';
import { serverClientFromCookies, supabaseConfigured } from '../../lib/supabase';

export const dynamic = 'force-dynamic';

interface ResultRow {
  date_key: string;
  day_number: number;
  puzzle_id: string;
  score: number;
  grid: string;
  solved: boolean;
}

/**
 * Your library: the legends you have played, kept under your account.
 * Signed-out visitors get the pitch — the library is the reason to sign in.
 */
export default async function Library() {
  const supabase = supabaseConfigured() ? await serverClientFromCookies() : null;
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (!user) {
    return (
      <main className="page">
        <div className="page-crumb">Library</div>
        <p className="blurb">
          Your library keeps every legend you&apos;ve played — scores, grids, and the games
          themselves, saved to your account. <Link href="/account">Sign in</Link> to start
          collecting, or <Link href="/">play today&apos;s legend</Link> first.
        </p>
      </main>
    );
  }

  const { data } = (await supabase
    ?.from('results')
    .select('date_key, day_number, puzzle_id, score, grid, solved')
    .eq('user_id', user.id)
    .order('date_key', { ascending: false })
    .limit(200)) ?? { data: null };
  const rows = (data ?? []) as unknown as ResultRow[];

  const puzzles = new Map(
    await Promise.all(
      [...new Set(rows.map((r) => r.puzzle_id))].map(
        async (id) => [id, await loadPuzzle(id)] as const,
      ),
    ),
  );
  const today = entryForNow(await loadCalendar(), new Date());

  return (
    <main className="page">
      <div className="page-crumb">Library</div>
      <p className="blurb">
        The legends you&apos;ve played.{' '}
        {today ? <Link href="/">Today is day #{today.dayNumber}.</Link> : null}
      </p>
      {rows.length === 0 ? (
        <p className="meta">
          Nothing here yet — <Link href="/">today&apos;s legend</Link> is waiting.
        </p>
      ) : (
        <ul className="puzzle-list" data-testid="my-games">
          {rows.map((r) => {
            const meta = puzzles.get(r.puzzle_id)?.meta;
            return (
              <li key={r.date_key}>
                <Link href={`/play/${r.puzzle_id}`}>
                  #{r.day_number} · {meta?.title ?? r.puzzle_id}
                </Link>
                <div className="meta">
                  {meta ? `${meta.heroName} · ${meta.year} · ` : ''}
                  {r.grid} · {r.score} pts · {r.date_key}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
