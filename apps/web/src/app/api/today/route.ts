import { NextResponse } from 'next/server';

import { loadCalendar } from '../../../lib/calendar.server';
import { entryForNow } from '../../../lib/daily';
import { loadPuzzle } from '../../../lib/puzzles.server';

export const dynamic = 'force-dynamic';

/**
 * Today's daily, sans solution — the uptime-check target and a stable little
 * API for widgets/bots. Never expose decision points here.
 */
export async function GET(): Promise<NextResponse> {
  const entry = entryForNow(await loadCalendar(), new Date());
  if (!entry) {
    return NextResponse.json({ ok: false, error: 'no daily scheduled' }, { status: 404 });
  }
  const puzzle = await loadPuzzle(entry.puzzleId);
  if (!puzzle) {
    return NextResponse.json({ ok: false, error: 'puzzle unavailable' }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    dayNumber: entry.dayNumber,
    date: entry.date,
    title: puzzle.meta.title,
    hero: puzzle.meta.heroName,
    event: puzzle.meta.event,
    year: puzzle.meta.year,
    points: puzzle.decisionPoints.length,
  });
}
