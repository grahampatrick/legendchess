/**
 * The lichess-style module row under the daily board: live leaderboard
 * preview, the legends strip, and the libre value proposition. Server
 * component — everything here degrades quietly when unconfigured.
 */
import Link from 'next/link';

import { LEGENDS, monogram } from '../data/legends';
import { loadCalendar } from '../lib/calendar.server';
import { entryForNow, utcDateKey } from '../lib/daily';
import { serverClientFromCookies, supabaseConfigured } from '../lib/supabase';

interface LeaderRow {
  score: number;
  solved: boolean;
  profiles: { handle: string } | null;
}

const topThree = async (): Promise<LeaderRow[]> => {
  if (!supabaseConfigured()) return [];
  const supabase = await serverClientFromCookies();
  const { data } = (await supabase
    ?.from('results')
    .select('score, solved, profiles(handle)')
    .eq('date_key', utcDateKey(new Date()))
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(3)) ?? { data: null };
  return (data ?? []) as unknown as LeaderRow[];
};

export default async function HomeModules() {
  const [rows, entry] = await Promise.all([
    topThree(),
    loadCalendar().then((c) => entryForNow(c, new Date())),
  ]);

  return (
    <div className="home-modules">
      <section className="module-card">
        <h3>
          <Link href="/leaderboard">Today&apos;s leaderboard</Link>
        </h3>
        {rows.length === 0 ? (
          <p className="meta">
            No verified results yet for day #{entry?.dayNumber ?? '—'}.{' '}
            <Link href="/account">Sign in</Link> and be first.
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
          {LEGENDS.map((l) =>
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
        <p className="meta">Morphy to Magnus — the players you step in for.</p>
      </section>

      <section className="module-card">
        <h3>Free, open source, no ads</h3>
        <p className="meta">
          One legendary game a day. Engine-verified partial credit. Built in the open under GPL-3.0
          —{' '}
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
