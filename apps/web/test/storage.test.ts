import { describe, expect, it } from 'vitest';

import {
  appendAction,
  completeDay,
  displayStreak,
  emptyState,
  lifetimeStats,
  streakAfterCompletion,
  type DayResult,
  type Streak,
} from '../src/lib/storage';

const fresh: Streak = { current: 0, best: 0, lastCompletedDate: null };

describe('streak logic (pure, fixed dates)', () => {
  it('first completion starts a streak of 1', () => {
    expect(streakAfterCompletion(fresh, '2026-07-04', '2026-07-03')).toEqual({
      current: 1,
      best: 1,
      lastCompletedDate: '2026-07-04',
    });
  });

  it('consecutive days extend the streak', () => {
    const day1 = streakAfterCompletion(fresh, '2026-07-04', '2026-07-03');
    const day2 = streakAfterCompletion(day1, '2026-07-05', '2026-07-04');
    expect(day2).toEqual({ current: 2, best: 2, lastCompletedDate: '2026-07-05' });
  });

  it('a missed day resets to 1 but best survives', () => {
    const built: Streak = { current: 5, best: 5, lastCompletedDate: '2026-07-01' };
    expect(streakAfterCompletion(built, '2026-07-04', '2026-07-03')).toEqual({
      current: 1,
      best: 5,
      lastCompletedDate: '2026-07-04',
    });
  });

  it('completing the same day twice never double-counts', () => {
    const once = streakAfterCompletion(fresh, '2026-07-04', '2026-07-03');
    expect(streakAfterCompletion(once, '2026-07-04', '2026-07-03')).toEqual(once);
  });

  it('display: today-unfinished does NOT break a chain ending yesterday', () => {
    const s: Streak = { current: 3, best: 3, lastCompletedDate: '2026-07-03' };
    expect(displayStreak(s, '2026-07-04', '2026-07-03')).toBe(3); // still alive
    expect(displayStreak(s, '2026-07-05', '2026-07-04')).toBe(0); // now broken
  });
});

describe('day records', () => {
  const meta = { dayNumber: 2, puzzleId: '0002-morphy-opera-1858' };

  it('appends actions in order', () => {
    let s = emptyState();
    s = appendAction(s, '2026-07-04', meta, { type: 'guess', uci: 'c1g5' });
    s = appendAction(s, '2026-07-04', meta, { type: 'hint' });
    expect(s.days['2026-07-04']).toEqual({
      ...meta,
      done: false,
      actions: [{ type: 'guess', uci: 'c1g5' }, { type: 'hint' }],
    });
  });

  it('completing a day marks it done and updates the streak once', () => {
    let s = emptyState();
    s = appendAction(s, '2026-07-04', meta, { type: 'guess', uci: 'c1g5' });
    s = completeDay(s, '2026-07-04', '2026-07-03');
    expect(s.days['2026-07-04']?.done).toBe(true);
    expect(s.streak.current).toBe(1);
    const again = completeDay(s, '2026-07-04', '2026-07-03');
    expect(again.streak.current).toBe(1);
  });

  it('completing an untracked day is a no-op', () => {
    const s = completeDay(emptyState(), '2026-07-04', '2026-07-03');
    expect(s.streak.current).toBe(0);
  });

  it('stores the result snapshot at completion', () => {
    let s = emptyState();
    s = appendAction(s, '2026-07-04', meta, { type: 'guess', uci: 'c1g5' });
    const result: DayResult = { score: 860, max: 900, solved: true, grid: '🟩🟨🟩🟩🟩🟩🟩🟩🟩' };
    s = completeDay(s, '2026-07-04', '2026-07-03', result);
    expect(s.days['2026-07-04']?.result).toEqual(result);
  });
});

describe('lifetimeStats', () => {
  const meta = { dayNumber: 1, puzzleId: '0001-kasparov-topalov-1999' };
  const dayWith = (
    s: ReturnType<typeof emptyState>,
    dateKey: string,
    yesterday: string,
    result: DayResult,
  ) =>
    completeDay(
      appendAction(s, dateKey, meta, { type: 'guess', uci: 'd1d4' }),
      dateKey,
      yesterday,
      result,
    );

  it('bands finished days by score share, with unfinished separate', () => {
    let s = emptyState();
    s = dayWith(s, '2026-07-01', '2026-06-30', { score: 1000, max: 1000, solved: true, grid: '' });
    s = dayWith(s, '2026-07-02', '2026-07-01', { score: 850, max: 1000, solved: true, grid: '' });
    s = dayWith(s, '2026-07-03', '2026-07-02', { score: 610, max: 1000, solved: true, grid: '' });
    s = dayWith(s, '2026-07-04', '2026-07-03', { score: 300, max: 1000, solved: false, grid: '' });
    const stats = lifetimeStats(s);
    expect(stats.played).toBe(4);
    expect(stats.perfect).toBe(1);
    expect(stats.solveRate).toBe(75);
    expect(stats.distribution.map((d) => d.count)).toEqual([1, 1, 1, 0, 0, 1]);
  });

  it('records without results still count as played, never in the bands', () => {
    let s = emptyState();
    s = appendAction(s, '2026-07-01', meta, { type: 'hint' });
    s = completeDay(s, '2026-07-01', '2026-06-30'); // pre-stats record: no result
    const stats = lifetimeStats(s);
    expect(stats.played).toBe(1);
    expect(stats.solveRate).toBe(0);
    expect(stats.distribution.every((d) => d.count === 0)).toBe(true);
  });

  it('is all zeros on a fresh state', () => {
    expect(lifetimeStats(emptyState()).played).toBe(0);
  });
});
