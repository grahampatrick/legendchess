import { describe, expect, it } from 'vitest';

import {
  appendAction,
  completeDay,
  displayStreak,
  emptyState,
  streakAfterCompletion,
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
});
