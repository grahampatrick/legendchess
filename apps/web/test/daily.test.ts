import { describe, expect, it } from 'vitest';

import {
  CalendarSchema,
  entryForNow,
  formatCountdown,
  msUntilNextRelease,
  previousDateKey,
  releaseDateKey,
  releasedPuzzleIds,
  type Calendar,
} from '../src/lib/daily';

const calendar: Calendar = CalendarSchema.parse({
  version: 1,
  days: [
    { date: '2026-07-03', puzzleId: 'a' },
    { date: '2026-07-04', puzzleId: 'b' },
    { date: '2026-07-05', puzzleId: 'c' },
    { date: '2026-07-06', puzzleId: 'a' }, // cycling repeat — must not double-release
  ],
});

describe('release-day selection (8am America/Los_Angeles)', () => {
  it('a new day starts exactly at 8am Pacific, not at any midnight', () => {
    // In July, LA is PDT (UTC-7): 8am PDT = 15:00 UTC.
    expect(releaseDateKey(new Date('2026-07-04T14:59:59Z'))).toBe('2026-07-03');
    expect(releaseDateKey(new Date('2026-07-04T15:00:00Z'))).toBe('2026-07-04');
  });

  it('is DST-correct: in winter the boundary is 8am PST = 16:00 UTC', () => {
    expect(releaseDateKey(new Date('2026-01-15T15:59:59Z'))).toBe('2026-01-14');
    expect(releaseDateKey(new Date('2026-01-15T16:00:00Z'))).toBe('2026-01-15');
  });

  it('maps a moment to the calendar entry with its day number', () => {
    const entry = entryForNow(calendar, new Date('2026-07-04T20:00:00Z'));
    expect(entry).toEqual({ date: '2026-07-04', puzzleId: 'b', dayNumber: 2 });
  });

  it('the puzzle changes exactly at the release boundary — the Wordle bug test', () => {
    expect(entryForNow(calendar, new Date('2026-07-05T14:59:59.999Z'))?.puzzleId).toBe('b');
    expect(entryForNow(calendar, new Date('2026-07-05T15:00:00.000Z'))?.puzzleId).toBe('c');
  });

  it('returns null outside the calendar', () => {
    expect(entryForNow(calendar, new Date('2030-01-01T00:00:00Z'))).toBeNull();
  });

  it('releasedPuzzleIds includes only days on or before the current release day', () => {
    const now = new Date('2026-07-04T20:00:00Z'); // release day 2026-07-04
    expect([...releasedPuzzleIds(calendar, now)].sort()).toEqual(['a', 'b']);
    const dayOne = new Date('2026-07-03T16:00:00Z');
    expect([...releasedPuzzleIds(calendar, dayOne)]).toEqual(['a']);
  });

  it('previousDateKey crosses month and year boundaries', () => {
    expect(previousDateKey('2026-07-01')).toBe('2026-06-30');
    expect(previousDateKey('2026-01-01')).toBe('2025-12-31');
    expect(previousDateKey('2028-03-01')).toBe('2028-02-29'); // leap year
  });
});

describe('countdown', () => {
  it('measures to the next 8am-Pacific release (within bisection tolerance)', () => {
    const oneHourBefore = msUntilNextRelease(new Date('2026-07-04T14:00:00Z'));
    expect(Math.abs(oneHourBefore - 3_600_000)).toBeLessThan(2_000);
    const justAfter = msUntilNextRelease(new Date('2026-07-04T15:00:01Z'));
    expect(Math.abs(justAfter - (24 * 3_600_000 - 1_000))).toBeLessThan(2_000);
  });

  it('formats as HH:MM:SS and clamps at zero', () => {
    expect(formatCountdown(3_661_000)).toBe('01:01:01');
    expect(formatCountdown(-5)).toBe('00:00:00');
  });
});
