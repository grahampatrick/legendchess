/**
 * The submit pipeline as a pure composition with injected effects, so the
 * whole auth → calendar → verify → insert path unit-tests with fakes and the
 * route handler stays a two-line adapter.
 */
import { type Puzzle } from '@legendchess/core';
import { z } from 'zod';

import { entryForDate, releaseDateKey, type Calendar } from './daily';
import { ActionLogSchema, VerificationError, verifySubmission } from './verify';

export const SubmitBodySchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  actions: ActionLogSchema.min(1),
});

export interface ResultRow {
  user_id: string;
  date_key: string;
  day_number: number;
  puzzle_id: string;
  actions: unknown;
  score: number;
  grid: string;
  lives_left: number;
  solved: boolean;
}

export interface SubmissionDeps {
  calendar: Calendar;
  loadPuzzle: (id: string) => Promise<Puzzle | null>;
  /** Resolve the authenticated user id from the request, or null. */
  getUserId: () => Promise<string | null>;
  /**
   * Insert the verified row. Must be idempotent per (user, day): return
   * 'inserted' or 'already-submitted' (first submission is final).
   */
  insertResult: (row: ResultRow) => Promise<'inserted' | 'already-submitted'>;
  now: () => Date;
}

export interface SubmissionResponse {
  status: number;
  body:
    | { ok: true; outcome: 'inserted' | 'already-submitted'; score: number; grid: string }
    | { ok: false; error: string };
}

export const processSubmission = async (
  deps: SubmissionDeps,
  rawBody: unknown,
): Promise<SubmissionResponse> => {
  const parsed = SubmitBodySchema.safeParse(rawBody);
  if (!parsed.success) return { status: 400, body: { ok: false, error: 'malformed submission' } };
  const { dateKey, actions } = parsed.data;

  const userId = await deps.getUserId();
  if (!userId) return { status: 401, body: { ok: false, error: 'sign in to submit' } };

  // Only TODAY's daily is submittable — the archive is for fun, not ranking.
  if (dateKey !== releaseDateKey(deps.now())) {
    return { status: 422, body: { ok: false, error: 'only today’s daily can be submitted' } };
  }
  const entry = entryForDate(deps.calendar, dateKey);
  if (!entry) return { status: 422, body: { ok: false, error: 'no daily scheduled for today' } };

  const puzzle = await deps.loadPuzzle(entry.puzzleId);
  if (!puzzle) return { status: 500, body: { ok: false, error: 'puzzle unavailable' } };

  try {
    const verified = verifySubmission(puzzle, actions);
    const outcome = await deps.insertResult({
      user_id: userId,
      date_key: dateKey,
      day_number: entry.dayNumber,
      puzzle_id: entry.puzzleId,
      actions,
      score: verified.score,
      grid: verified.grid,
      lives_left: verified.livesLeft,
      solved: verified.solved,
    });
    return {
      status: 200,
      body: { ok: true, outcome, score: verified.score, grid: verified.grid },
    };
  } catch (e) {
    if (e instanceof VerificationError) {
      return { status: 422, body: { ok: false, error: e.message } };
    }
    throw e;
  }
};
