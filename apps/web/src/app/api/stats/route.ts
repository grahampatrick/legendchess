import { NextResponse } from 'next/server';

import { loadCalendar } from '../../../lib/calendar.server';
import { entryForNow, releaseDateKey } from '../../../lib/daily';
import { loadPuzzle } from '../../../lib/puzzles.server';
import { aggregateDaily, MIN_PLAYERS_FOR_STATS, type ResultRowLike } from '../../../lib/stats';
import { serverClientFromCookies, supabaseConfigured } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

// Aggregation replays every submitted log — cache per instance for a minute.
let cache: { dateKey: string; at: number; body: unknown } | null = null;
const CACHE_MS = 60_000;

/** Anonymous social proof for today's daily: solve rate, per-move find rate. */
export async function GET(): Promise<NextResponse> {
  if (!supabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'not configured' }, { status: 503 });
  }
  const now = new Date();
  const dateKey = releaseDateKey(now);
  if (cache && cache.dateKey === dateKey && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json(cache.body);
  }

  const entry = entryForNow(await loadCalendar(), now);
  const puzzle = entry ? await loadPuzzle(entry.puzzleId) : null;
  if (!entry || !puzzle) {
    return NextResponse.json({ ok: false, error: 'no daily' }, { status: 404 });
  }

  const supabase = await serverClientFromCookies();
  const { data } = (await supabase
    ?.from('results')
    .select('actions, score, solved')
    .eq('date_key', dateKey)
    .limit(2000)) ?? { data: null };

  const stats = aggregateDaily(puzzle, (data ?? []) as ResultRowLike[]);
  const body = {
    ok: true,
    players: stats.players,
    solved: stats.solved,
    // Below the threshold the percentages are noise — clients hide them.
    usable: stats.players >= MIN_PLAYERS_FOR_STATS,
    foundFirstTry: stats.foundFirstTry.map((f) => Math.round(f * 100)),
    scores: stats.scores,
  };
  cache = { dateKey, at: Date.now(), body };
  return NextResponse.json(body);
}
