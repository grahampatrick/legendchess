/**
 * Daily selection: pure functions over the published calendar. Every function
 * takes the current time as a parameter — no hidden clocks (testability, and
 * non-negotiable #6: same UTC date → same puzzle for everyone).
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

/** The UTC date key (YYYY-MM-DD) for a moment in time. */
export const utcDateKey = (now: Date): string => now.toISOString().slice(0, 10);

/** Yesterday's UTC date key relative to a date key. */
export const previousDateKey = (dateKey: string): string =>
  new Date(new Date(`${dateKey}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);

export const entryForDate = (calendar: Calendar, dateKey: string): DailyEntry | null => {
  const index = calendar.days.findIndex((d) => d.date === dateKey);
  if (index === -1) return null;
  return { ...calendar.days[index]!, dayNumber: index + 1 };
};

export const entryForNow = (calendar: Calendar, now: Date): DailyEntry | null =>
  entryForDate(calendar, utcDateKey(now));

/** All entries strictly before the given date key, newest first (the archive). */
export const archiveEntries = (calendar: Calendar, dateKey: string): DailyEntry[] =>
  calendar.days
    .map((d, i) => ({ ...d, dayNumber: i + 1 }))
    .filter((d) => d.date < dateKey)
    .reverse();

/** Milliseconds from `now` until the next UTC midnight (the next puzzle). */
export const msUntilNextUtcMidnight = (now: Date): number => {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
};

export const formatCountdown = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};
