import Link from 'next/link';

import { loadCalendar } from '../../lib/calendar.server';
import { archiveEntries, utcDateKey } from '../../lib/daily';
import { listPuzzles } from '../../lib/puzzles.server';

export const dynamic = 'force-dynamic';

export default async function Archive() {
  const calendar = await loadCalendar();
  const entries = archiveEntries(calendar, utcDateKey(new Date()));
  const titles = new Map((await listPuzzles()).map((p) => [p.id, p.meta.title]));

  return (
    <main className="page">
      <div className="site-title">
        <a href="/">
          <span className="knight">♞</span> Play the Legend
        </a>{' '}
        <span style={{ color: 'var(--text-dim)' }}>· archive</span>
      </div>
      <p className="blurb">
        Past dailies — playable any time, but they don&apos;t count toward your streak.{' '}
        <Link href="/">Today&apos;s puzzle</Link> does.
      </p>
      {entries.length === 0 ? (
        <p className="meta">Nothing here yet — day #1 is today. Come back tomorrow.</p>
      ) : (
        <ul className="puzzle-list">
          {entries.map((e) => (
            <li key={e.date}>
              <Link href={`/play/${e.puzzleId}`}>
                #{e.dayNumber} — {titles.get(e.puzzleId) ?? e.puzzleId}
              </Link>
              <div className="meta">{e.date}</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
