import Link from 'next/link';

import { loadCalendar } from '../../lib/calendar.server';
import { entryForDate, previousDateKey, releaseDateKey } from '../../lib/daily';
import { loadPuzzle } from '../../lib/puzzles.server';
import { serverClientFromCookies, supabaseConfigured } from '../../lib/supabase';

export const dynamic = 'force-dynamic';

interface Row {
  score: number;
  grid: string;
  solved: boolean;
  created_at: string;
  profiles: { handle: string } | null;
}

/**
 * Standings are FINAL, published once per day: the board always shows the
 * most recently completed day, never a live-updating race. Today's results
 * publish when the next legend releases (8am Pacific).
 */
export default async function Leaderboard() {
  if (!supabaseConfigured()) {
    return (
      <main className="page">
        <div className="page-crumb">Leaderboard</div>
        <p className="blurb">
          The leaderboard isn&apos;t configured in this deployment. Anonymous play works fully
          without it — <Link href="/">today&apos;s daily is here</Link>.
        </p>
      </main>
    );
  }

  const now = new Date();
  const calendar = await loadCalendar();
  const finalKey = previousDateKey(releaseDateKey(now));
  const finalEntry = entryForDate(calendar, finalKey);
  const finalPuzzle = finalEntry ? await loadPuzzle(finalEntry.puzzleId) : null;

  const supabase = await serverClientFromCookies();
  const { data } = finalEntry
    ? ((await supabase
        ?.from('results')
        .select('score, grid, solved, created_at, profiles(handle)')
        .eq('date_key', finalKey)
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(50)) ?? { data: null })
    : { data: null };
  const rows = (data ?? []) as unknown as Row[];

  return (
    <main className="page">
      <div className="page-crumb">Leaderboard</div>
      {finalEntry && finalPuzzle ? (
        <>
          <p className="blurb">
            Final standings — day #{finalEntry.dayNumber}, {finalPuzzle.meta.title} (
            {finalPuzzle.meta.heroName}, {finalPuzzle.meta.year}). Today&apos;s standings publish
            when the next legend releases at 8&nbsp;AM Pacific.
          </p>
          {rows.length === 0 ? (
            <p className="meta">No verified results for that day.</p>
          ) : (
            <ul className="puzzle-list" data-testid="leaderboard">
              {rows.map((r, i) => (
                <li key={i}>
                  <strong>
                    {i + 1}. {r.profiles?.handle ?? 'anonymous'}
                  </strong>{' '}
                  — {r.score} pts
                  <div className="meta">{r.grid}</div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="blurb">
          The first standings publish when day #1 ends — at tomorrow&apos;s 8&nbsp;AM Pacific
          release. <Link href="/">Play today&apos;s legend</Link> and be on it.
        </p>
      )}
      <p className="meta">
        <Link href="/account">Sign in / manage account</Link> — signed-in finishes enter the
        standings.
      </p>
    </main>
  );
}
