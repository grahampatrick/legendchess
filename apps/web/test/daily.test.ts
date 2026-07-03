import { describe, expect, it } from 'vitest';

import {
  CalendarSchema,
  archiveEntries,
  entryForNow,
  formatCountdown,
  msUntilNextUtcMidnight,
  previousDateKey,
  utcDateKey,
  type Calendar,
} from '../src/lib/daily';

const calendar: Calendar = CalendarSchema.parse({
  version: 1,
  days: [
    { date: '2026-07-03', puzzleId: 'a' },
    { date: '2026-07-04', puzzleId: 'b' },
    { date: '2026-07-05', puzzleId: 'c' },
  ],
});

describe('daily selection and date rollover', () => {
  it('maps a UTC moment to the calendar entry with its day number', () => {
    const entry = entryForNow(calendar, new Date('2026-07-04T12:00:00Z'));
    expect(entry).toEqual({ date: '2026-07-04', puzzleId: 'b', dayNumber: 2 });
  });

  it('the puzzle changes exactly at UTC midnight — the Wordle bug test', () => {
    const lastMoment = new Date('2026-07-04T23:59:59.999Z');
    const firstMoment = new Date('2026-07-05T00:00:00.000Z');
    expect(entryForNow(calendar, lastMoment)?.puzzleId).toBe('b');
    expect(entryForNow(calendar, firstMoment)?.puzzleId).toBe('c');
  });

  it('local timezones are irrelevant: the key is derived from UTC', () => {
    // 2026-07-04 19:00 in UTC-10 is 2026-07-05 05:00 UTC → day 3.
    const now = new Date('2026-07-05T05:00:00Z');
    expect(utcDateKey(now)).toBe('2026-07-05');
    expect(entryForNow(calendar, now)?.dayNumber).toBe(3);
  });

  it('returns null outside the calendar', () => {
    expect(entryForNow(calendar, new Date('2030-01-01T00:00:00Z'))).toBeNull();
  });

  it('archive lists only strictly-past days, newest first', () => {
    expect(archiveEntries(calendar, '2026-07-05').map((e) => e.dayNumber)).toEqual([2, 1]);
    expect(archiveEntries(calendar, '2026-07-03')).toEqual([]);
  });

  it('previousDateKey crosses month and year boundaries', () => {
    expect(previousDateKey('2026-07-01')).toBe('2026-06-30');
    expect(previousDateKey('2026-01-01')).toBe('2025-12-31');
    expect(previousDateKey('2028-03-01')).toBe('2028-02-29'); // leap year
  });
});

describe('countdown', () => {
  it('measures to the next UTC midnight', () => {
    expect(msUntilNextUtcMidnight(new Date('2026-07-04T23:59:59.000Z'))).toBe(1000);
    expect(msUntilNextUtcMidnight(new Date('2026-07-04T00:00:00.000Z'))).toBe(86_400_000);
  });

  it('formats as HH:MM:SS and clamps at zero', () => {
    expect(formatCountdown(3_661_000)).toBe('01:01:01');
    expect(formatCountdown(-5)).toBe('00:00:00');
  });
});
