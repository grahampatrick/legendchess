import { NextResponse } from 'next/server';

import { loadCalendar } from '../../../lib/calendar.server';
import { loadPuzzle } from '../../../lib/puzzles.server';
import { serverClientFromCookies, serviceClient, supabaseConfigured } from '../../../lib/supabase';
import { processSubmission, type ResultRow } from '../../../lib/submission';

// Best-effort per-instance rate limit; the DB unique constraint is the real gate.
const recent = new Map<string, number>();
const RATE_MS = 5_000;

export async function POST(request: Request): Promise<NextResponse> {
  if (!supabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'leaderboard not configured' }, { status: 503 });
  }

  const response = await processSubmission(
    {
      calendar: await loadCalendar(),
      loadPuzzle,
      now: () => new Date(),
      getUserId: async () => {
        const supabase = await serverClientFromCookies();
        const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
        const id = data.user?.id ?? null;
        if (id) {
          const last = recent.get(id) ?? 0;
          if (Date.now() - last < RATE_MS) return null; // treat as unauthenticated → 401
          recent.set(id, Date.now());
        }
        return id;
      },
      insertResult: async (row: ResultRow) => {
        const service = serviceClient();
        if (!service) throw new Error('service role not configured');
        const { error } = await service.from('results').insert(row);
        if (!error) return 'inserted';
        if (error.code === '23505') return 'already-submitted'; // unique (user, day)
        throw new Error(`insert failed: ${error.message}`);
      },
    },
    await request.json().catch(() => null),
  );

  return NextResponse.json(response.body, { status: response.status });
}
