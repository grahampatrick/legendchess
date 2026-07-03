import Link from 'next/link';

import { loadCalendar } from '../../lib/calendar.server';
import { entryForNow, utcDateKey } from '../../lib/daily';
import { serverClientFromCookies, supabaseConfigured } from '../../lib/supabase';

export const dynamic = 'force-dynamic';

interface Row {
  score: number;
  grid: string;
  solved: boolean;
  created_at: string;
  profiles: { handle: string } | null;
}

export default async function Leaderboard() {
  const header = (
    <div className="site-title">
      <a href="/">
        <span className="knight">♞</span> Play the Legend
      </a>{' '}
      <span style={{ color: 'var(--text-dim)' }}>· leaderboard</span>
    </div>
  );

  if (!supabaseConfigured()) {
    return (
      <main className="page">
        {header}
        <p className="blurb">
          The leaderboard isn&apos;t configured in this deployment. Anonymous play works fully
          without it — <Link href="/">today&apos;s daily is here</Link>.
        </p>
      </main>
    );
  }

  const now = new Date();
  const entry = entryForNow(await loadCalendar(), now);
  const supabase = await serverClientFromCookies();
  const { data } = (await supabase
    ?.from('results')
    .select('score, grid, solved, created_at, profiles(handle)')
    .eq('date_key', utcDateKey(now))
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(50)) ?? { data: null };
  const rows = (data ?? []) as unknown as Row[];

  return (
    <main className="page">
      {header}
      <p className="blurb">
        Day #{entry?.dayNumber ?? '—'} · first submission is final · verified server-side.
      </p>
      {rows.length === 0 ? (
        <p className="meta">No verified results yet today. Be the first.</p>
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
      <p className="meta">
        <Link href="/account">Sign in / manage account</Link>
      </p>
    </main>
  );
}
