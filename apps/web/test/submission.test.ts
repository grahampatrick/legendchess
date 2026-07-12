/**
 * The auth-mocked submit path: the full pipeline with injected fakes —
 * auth, calendar window, verification, idempotent insert.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { validatePuzzle } from '@legendchess/core';

import { CalendarSchema } from '../src/lib/daily';
import { processSubmission, type ResultRow, type SubmissionDeps } from '../src/lib/submission';

const puzzle = validatePuzzle(
  JSON.parse(
    readFileSync(
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../../fixtures/puzzles/0001-kasparov-topalov-1999.json',
      ),
      'utf8',
    ),
  ),
);

const calendar = CalendarSchema.parse({
  version: 1,
  days: [{ date: '2026-07-03', puzzleId: puzzle.id }],
});

const perfectActions = puzzle.decisionPoints.map((dp) => ({
  type: 'guess' as const,
  uci: dp.hero.uci,
}));

const makeDeps = (overrides: Partial<SubmissionDeps> = {}) => {
  const inserted: ResultRow[] = [];
  const deps: SubmissionDeps = {
    calendar,
    loadPuzzle: async (id) => (id === puzzle.id ? puzzle : null),
    getUserId: async () => 'user-1',
    insertResult: async (row) => {
      if (inserted.some((r) => r.user_id === row.user_id && r.date_key === row.date_key)) {
        return 'already-submitted';
      }
      inserted.push(row);
      return 'inserted';
    },
    now: () => new Date('2026-07-03T20:00:00Z'),
    ...overrides,
  };
  return { deps, inserted };
};

const body = { dateKey: '2026-07-03', actions: perfectActions };

describe('processSubmission', () => {
  it('verifies and inserts a valid signed-in submission', async () => {
    const { deps, inserted } = makeDeps();
    const res = await processSubmission(deps, body);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, outcome: 'inserted', score: 1000 });
    expect(inserted[0]).toMatchObject({
      user_id: 'user-1',
      day_number: 1,
      puzzle_id: puzzle.id,
      solved: true,
      lives_left: 5,
    });
  });

  it('first submission is final — replays report already-submitted', async () => {
    const { deps } = makeDeps();
    await processSubmission(deps, body);
    const second = await processSubmission(deps, body);
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ ok: true, outcome: 'already-submitted' });
  });

  it('rejects unauthenticated submissions with 401', async () => {
    const { deps } = makeDeps({ getUserId: async () => null });
    expect((await processSubmission(deps, body)).status).toBe(401);
  });

  it('rejects submissions for any day but today', async () => {
    const { deps } = makeDeps({ now: () => new Date('2026-07-04T15:00:01Z') });
    const res = await processSubmission(deps, body);
    expect(res.status).toBe(422);
  });

  it('rejects a tampered log with 422 and never inserts', async () => {
    const { deps, inserted } = makeDeps();
    const res = await processSubmission(deps, {
      dateKey: '2026-07-03',
      actions: perfectActions.slice(0, 2), // unfinished game
    });
    expect(res.status).toBe(422);
    expect(inserted).toHaveLength(0);
  });

  it('rejects malformed bodies with 400', async () => {
    const { deps } = makeDeps();
    expect((await processSubmission(deps, { nonsense: true })).status).toBe(400);
    expect((await processSubmission(deps, null)).status).toBe(400);
  });

  it('a claimed client score is simply ignored — the server computes its own', async () => {
    const { deps, inserted } = makeDeps();
    await processSubmission(deps, { ...body, score: 999999 });
    expect(inserted[0]?.score).toBe(1000);
  });
});
