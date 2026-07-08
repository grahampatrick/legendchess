/**
 * Social-proof aggregation over the day's verified results: how many players,
 * how many solved, what share found each hero move on the FIRST try, and
 * percentile for a score. Pure — rows in, numbers out; the action logs replay
 * through the same core session that graded them (one ruleset, everywhere).
 */
import { createSession, type Puzzle } from '@legendchess/core';

import type { SubmittedAction } from './verify';

export interface DailyStats {
  players: number;
  solved: number;
  /** Per decision point: fraction [0..1] of players whose FIRST guess there was exact. */
  foundFirstTry: number[];
  /** All verified scores, for percentile display. */
  scores: number[];
}

export interface ResultRowLike {
  actions: SubmittedAction[];
  score: number;
  solved: boolean;
}

export const aggregateDaily = (puzzle: Puzzle, rows: ResultRowLike[]): DailyStats => {
  const points = puzzle.decisionPoints.length;
  const firstTryCounts = new Array<number>(points).fill(0);
  let solved = 0;

  for (const row of rows) {
    if (row.solved) solved += 1;
    try {
      const session = createSession(puzzle);
      const attempted = new Set<number>();
      for (const action of row.actions) {
        const index = session.state().currentIndex;
        if (action.type === 'hint') {
          session.requestHint();
          attempted.add(index); // a hint spends the first try's purity
          continue;
        }
        const firstAttempt = !attempted.has(index);
        attempted.add(index);
        const outcome = session.guess(action.uci);
        if (outcome.result === 'exact' && firstAttempt) firstTryCounts[index]! += 1;
        if (outcome.done) break;
      }
    } catch {
      // A row that no longer replays (ruleset drift) simply doesn't count.
    }
  }

  return {
    players: rows.length,
    solved,
    foundFirstTry: firstTryCounts.map((n) => (rows.length ? n / rows.length : 0)),
    scores: rows.map((r) => r.score),
  };
};

/** Share of scores this score beats, as a whole percentage [0..100]. */
export const percentile = (score: number, scores: readonly number[]): number => {
  if (scores.length === 0) return 0;
  const beaten = scores.filter((s) => s < score).length;
  return Math.round((beaten / scores.length) * 100);
};

/** Below this many players, per-move percentages are noise — hide them. */
export const MIN_PLAYERS_FOR_STATS = 5;
