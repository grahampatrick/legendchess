/**
 * Generates content/calendar.json: 365 days cycling the shipped puzzles,
 * starting from the CURRENT release day (a "day" flips at 8am Pacific — the
 * same clock as apps/web/src/lib/daily.ts). Regenerating resets day #1 to
 * now. The format (date → puzzleId, day number = array index + 1) is final.
 *
 * Usage: node scripts/gen-calendar.mjs
 */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Mirror of releaseDateKey in apps/web/src/lib/daily.ts.
const releaseDateKey = (now) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now.getTime() - 8 * 3_600_000));
const START = releaseDateKey(new Date());
const DAYS = 365;

const ids = readdirSync(path.join(ROOT, 'dist/puzzles'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .sort();
if (ids.length === 0) throw new Error('no puzzles in dist/puzzles');

const start = new Date(`${START}T00:00:00Z`);
const days = Array.from({ length: DAYS }, (_, i) => {
  const d = new Date(start.getTime() + i * 86_400_000);
  return { date: d.toISOString().slice(0, 10), puzzleId: ids[i % ids.length] };
});

const out = path.join(ROOT, 'content/calendar.json');
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ version: 1, days }, null, 2) + '\n');
console.log(`wrote ${out}: ${DAYS} days from ${START} cycling ${ids.length} puzzles`);
