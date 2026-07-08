import Link from 'next/link';

import { loadCalendar } from '../lib/calendar.server';
import { entryForNow, utcDateKey } from '../lib/daily';
import { loadPuzzle } from '../lib/puzzles.server';
import { sealPuzzle } from '../lib/seal';
import PlayView from '../components/PlayView';

export const dynamic = 'force-dynamic'; // today's puzzle depends on the UTC date

export default async function DailyPage() {
  const now = new Date();
  const calendar = await loadCalendar();
  const entry = entryForNow(calendar, now);
  const puzzle = entry ? await loadPuzzle(entry.puzzleId) : null;

  if (!entry || !puzzle) {
    return (
      <main className="page">
        <div className="site-title">
          <span className="knight">♞</span> LegendChess
        </div>
        <p className="blurb">
          No daily legend is scheduled for today — the calendar resumes soon. Meanwhile,{' '}
          <Link href="/library">the training library</Link> is open.
        </p>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="site-title">
        <a href="/">
          <span className="knight">♞</span> LegendChess
        </a>{' '}
        <span style={{ color: 'var(--text-dim)' }}>
          · daily #{entry.dayNumber} · <Link href="/archive">archive</Link> ·{' '}
          <Link href="/legends">legends</Link>
        </span>
      </div>
      <PlayView
        sealed={sealPuzzle(puzzle)}
        mode="daily"
        dayNumber={entry.dayNumber}
        dateKey={utcDateKey(now)}
      />
    </main>
  );
}
