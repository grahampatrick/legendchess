/**
 * localStorage persistence: today's in-progress action log (refresh-safe),
 * per-day results, streaks, lifetime stats. Versioned from day one so a
 * future schema change is a migration, not data loss.
 *
 * Streak logic is pure (dates in, streak out) — unit-tested with fixed dates.
 * The action log replays through core's real session on restore: one ruleset,
 * no serialized game state to drift.
 */

export type DailyAction = { type: 'guess'; uci: string } | { type: 'hint' };

/** Outcome snapshot stored at completion — powers the lifetime stats modal. */
export interface DayResult {
  score: number;
  max: number;
  solved: boolean;
  grid: string;
}

export interface DayRecord {
  dayNumber: number;
  puzzleId: string;
  actions: DailyAction[];
  /** Set when the session finished (solved or spectator). */
  done: boolean;
  /** Optional for records written before stats existed. */
  result?: DayResult;
}

export interface Streak {
  current: number;
  best: number;
  lastCompletedDate: string | null;
}

export interface StoredState {
  version: 1;
  streak: Streak;
  days: Record<string, DayRecord>;
}

const KEY = 'legendchess.v1';

export const emptyState = (): StoredState => ({
  version: 1,
  streak: { current: 0, best: 0, lastCompletedDate: null },
  days: {},
});

export const loadState = (): StoredState => {
  if (typeof window === 'undefined') return emptyState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as StoredState;
    if (parsed.version !== 1) return emptyState(); // future: migrate
    return parsed;
  } catch {
    return emptyState();
  }
};

export const saveState = (state: StoredState): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked — play continues, persistence is best-effort */
  }
};

/**
 * Streak update on completing the daily for `dateKey`.
 * Completing = finishing the session (solved OR spectator — you showed up).
 * Already-completed days never double-count.
 */
export const streakAfterCompletion = (
  streak: Streak,
  dateKey: string,
  yesterdayKey: string,
): Streak => {
  if (streak.lastCompletedDate === dateKey) return streak;
  const current = streak.lastCompletedDate === yesterdayKey ? streak.current + 1 : 1;
  return { current, best: Math.max(streak.best, current), lastCompletedDate: dateKey };
};

/**
 * The streak as it should be DISPLAYED at `dateKey`: a chain ending yesterday
 * is still alive (today just isn't played yet); anything older is broken.
 */
export const displayStreak = (streak: Streak, dateKey: string, yesterdayKey: string): number => {
  if (streak.lastCompletedDate === dateKey || streak.lastCompletedDate === yesterdayKey) {
    return streak.current;
  }
  return 0;
};

export const dayRecord = (state: StoredState, dateKey: string): DayRecord | null =>
  state.days[dateKey] ?? null;

export const appendAction = (
  state: StoredState,
  dateKey: string,
  meta: { dayNumber: number; puzzleId: string },
  action: DailyAction,
): StoredState => {
  const existing = state.days[dateKey] ?? { ...meta, actions: [], done: false };
  return {
    ...state,
    days: {
      ...state.days,
      [dateKey]: { ...existing, actions: [...existing.actions, action] },
    },
  };
};

export const completeDay = (
  state: StoredState,
  dateKey: string,
  yesterdayKey: string,
  result?: DayResult,
): StoredState => {
  const existing = state.days[dateKey];
  if (!existing || existing.done) {
    return existing ? state : state; // completing an untracked day is a no-op
  }
  return {
    ...state,
    days: { ...state.days, [dateKey]: { ...existing, done: true, ...(result ? { result } : {}) } },
    streak: streakAfterCompletion(state.streak, dateKey, yesterdayKey),
  };
};

/** Lifetime numbers for the stats modal — pure, derived entirely from state. */
export interface LifetimeStats {
  played: number;
  /** Whole percentage of finished days that ended solved (result-bearing only). */
  solveRate: number;
  perfect: number;
  distribution: { label: string; count: number }[];
}

const BAND_LABELS = ['Perfect', '80%+', '60–79%', '40–59%', 'Under 40%', 'Unfinished'] as const;

const band = (r: DayResult): number => {
  if (!r.solved) return 5;
  const pct = r.max > 0 ? r.score / r.max : 0;
  if (pct >= 1) return 0;
  if (pct >= 0.8) return 1;
  if (pct >= 0.6) return 2;
  if (pct >= 0.4) return 3;
  return 4;
};

export const lifetimeStats = (state: StoredState): LifetimeStats => {
  const finished = Object.values(state.days).filter((d) => d.done);
  const results = finished.map((d) => d.result).filter((r): r is DayResult => r !== undefined);
  const counts = [0, 0, 0, 0, 0, 0];
  for (const r of results) counts[band(r)]! += 1;
  const solved = results.filter((r) => r.solved).length;
  return {
    played: finished.length,
    solveRate: results.length ? Math.round((solved / results.length) * 100) : 0,
    perfect: counts[0]!,
    distribution: BAND_LABELS.map((label, i) => ({ label, count: counts[i]! })),
  };
};
