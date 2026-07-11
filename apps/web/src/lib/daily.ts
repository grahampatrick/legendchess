/**
 * Daily selection: pure functions over the published calendar. Every function
 * takes the current time as a parameter — no hidden clocks (testability, and
 * non-negotiable #6: same release day → same puzzle for everyone).
 *
 * Release boundary: a new legend drops at 08:00 America/Los_Angeles (so the
 * date key for a moment is the LA calendar date of that moment minus 8h —
 * before 8am Pacific you are still on yesterday's legend). DST-correct via
 * Intl; the "next release" instant is found by bisection, which sidesteps
 * every offset-arithmetic trap.
 */
import { z } from 'zod';

export const CalendarSchema = z.object({
  version: z.literal(1),
  days: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        puzzleId: z.string(),
      }),
    )
    .min(1),
});

export type Calendar = z.infer<typeof CalendarSchema>;

export interface DailyEntry {
  date: string;
  puzzleId: string;
  /** 1-based day number — the "#37" in the share text. */
  dayNumber: number;
}

const RELEASE_TZ = 'America/Los_Angeles';
const RELEASE_HOUR = 8;
const keyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: RELEASE_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The release-day key (YYYY-MM-DD) for a moment: LA date of (now − 8h). */
export const releaseDateKey = (now: Date): string =>
  keyFormat.format(new Date(now.getTime() - RELEASE_HOUR * 3_600_000));

/** Yesterday's date key relative to a date key (pure date arithmetic). */
export const previousDateKey = (dateKey: string): string =>
  new Date(new Date(`${dateKey}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);

export const entryForDate = (calendar: Calendar, dateKey: string): DailyEntry | null => {
  const index = calendar.days.findIndex((d) => d.date === dateKey);
  if (index === -1) return null;
  return { ...calendar.days[index]!, dayNumber: index + 1 };
};

export const entryForNow = (calendar: Calendar, now: Date): DailyEntry | null =>
  entryForDate(calendar, releaseDateKey(now));

/**
 * Puzzle ids released so far: everything whose first calendar appearance is
 * on or before the current release day. One legend a day — nothing leaks.
 */
export const releasedPuzzleIds = (calendar: Calendar, now: Date): Set<string> => {
  const key = releaseDateKey(now);
  const released = new Set<string>();
  for (const day of calendar.days) {
    if (day.date > key) break;
    released.add(day.puzzleId);
  }
  return released;
};

/** Milliseconds from `now` until the next 8am-Pacific release (bisection: DST-proof). */
export const msUntilNextRelease = (now: Date): number => {
  const key = releaseDateKey(now);
  let lo = now.getTime();
  let hi = lo + 26 * 3_600_000;
  while (releaseDateKey(new Date(hi)) === key) hi += 3_600_000;
  while (hi - lo > 250) {
    const mid = Math.floor((lo + hi) / 2);
    if (releaseDateKey(new Date(mid)) === key) lo = mid;
    else hi = mid;
  }
  return Math.max(0, hi - now.getTime());
};

export const formatCountdown = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};
