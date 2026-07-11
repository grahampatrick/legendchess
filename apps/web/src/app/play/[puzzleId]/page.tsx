import { notFound, redirect } from 'next/navigation';

import PlayView from '../../../components/PlayView';
import { loadCalendar } from '../../../lib/calendar.server';
import { releasedPuzzleIds } from '../../../lib/daily';
import { loadPuzzle } from '../../../lib/puzzles.server';
import { sealPuzzle } from '../../../lib/seal';

export const dynamic = 'force-dynamic';

/** Only RELEASED legends are playable — one a day, no early peeking. */
export default async function PlayPage({ params }: { params: Promise<{ puzzleId: string }> }) {
  const { puzzleId } = await params;
  const released = releasedPuzzleIds(await loadCalendar(), new Date());
  if (!released.has(puzzleId)) redirect('/');
  const puzzle = await loadPuzzle(puzzleId);
  if (!puzzle) notFound();
  return (
    <main className="page">
      <div className="page-crumb">Free play</div>
      <PlayView sealed={sealPuzzle(puzzle)} mode="free" />
    </main>
  );
}
