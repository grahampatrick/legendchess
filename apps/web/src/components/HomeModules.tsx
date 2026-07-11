/**
 * The lichess-style module row under the daily board: live leaderboard
 * preview, the legends strip, and the libre value proposition. Server
 * component — everything here degrades quietly when unconfigured.
 */
import Link from 'next/link';

import { LEGENDS, monogram } from '../data/legends';
import { loadCalendar } from '../lib/calendar.server';
import { entryForDate, previousDateKey, releaseDateKey, releasedPuzzleIds } from '../lib/daily';
import { listPuzzles } from '../lib/puzzles.server';
import { serverClientFromCookies, supabaseConfigured } from '../lib/supabase';

interface LeaderRow {
  score: number;
  solved: boolean;
  profiles: { handle: string } | null;
}

/** Standings publish once per day: the module shows the last COMPLETED day. */
const finalTopThree = async (dateKey: string): Promise<LeaderRow[]> => {
  if (!supabaseConfigured()) return [];
  const supabase = await serverClientFromCookies();
  const { data } = (await supabase
    ?.from('results')
    .select('score, solved, profiles(handle)')
    .eq('date_key', dateKey)
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(3)) ?? { data: null };
  return (data ?? []) as unknown as LeaderRow[];
};

export default async function HomeModules() {
  const now = new Date();
  const calendar = await loadCalendar();
  const finalKey = previousDateKey(releaseDateKey(now));
  const finalEntry = entryForDate(calendar, finalKey);
  const rows = finalEntry ? await finalTopThree(finalKey) : [];
  const released = releasedPuzzleIds(calendar, now);
  const releasedPuzzles = (await listPuzzles()).filter((p) => released.has(p.id));
  const revealed = LEGENDS.filter((l) =>
    releasedPuzzles.some((p) => p.meta.heroName === l.heroName),
  );
  const hidden = LEGENDS.length - revealed.length;

  return (
    <div className="home-modules">
      <section className="module-card">
        <h3>
          <Link href="/leaderboard">Final standings</Link>
        </h3>
        {rows.length === 0 ? (
          <p className="meta">
            {finalEntry
              ? `Day #${finalEntry.dayNumber} had no verified finishers.`
              : "Day #1 standings publish at tomorrow's 8 AM Pacific release."}{' '}
            <Link href="/account">Sign in</Link> to be on the next board.
          </p>
        ) : (
          <ol className="lb-mini">
            {rows.map((r, i) => (
              <li key={i}>
                <span className="lb-rank">{i + 1}</span> {r.profiles?.handle ?? 'anonymous'}
                <span className="lb-score">{r.score}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="module-card">
        <h3>
          <Link href="/legends">The legends</Link>
        </h3>
        <div className="legend-strip">
          {revealed.map((l) =>
            l.portrait ? (
              <Link key={l.slug} href={`/legends#${l.slug}`} title={l.heroName}>
                <img
                  className="strip-portrait"
                  src={`/legends/${l.portrait}`}
                  alt={l.heroName}
                  width={40}
                  height={40}
                />
              </Link>
            ) : (
              <Link key={l.slug} href={`/legends#${l.slug}`} title={l.heroName}>
                <span className="strip-portrait strip-monogram">{monogram(l.heroName)}</span>
              </Link>
            ),
          )}
        </div>
        <p className="meta">
          {hidden > 0
            ? 'A new legend joins every day at 8 AM Pacific.'
            : 'Morphy to Magnus — the players you step in for.'}
        </p>
      </section>

      <section className="module-card">
        <h3>Free and open source</h3>
        <p className="meta">
          One legendary game a day, released at 8 AM Pacific. Match the legend&apos;s move — or play
          one the engine rates just as strong and still score. Built in the open under GPL-3.0 —{' '}
          <a href="https://github.com/grahampatrick/legendchess" rel="noopener">
            read the code
          </a>{' '}
          or{' '}
          <a
            href="https://github.com/grahampatrick/legendchess/blob/main/CONTRIBUTING.md"
            rel="noopener"
          >
            contribute a famous game
          </a>
          .
        </p>
      </section>
    </div>
  );
}
