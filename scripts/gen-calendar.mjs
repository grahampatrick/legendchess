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
const startArg = process.argv.find((a) => a.startsWith('--start='))?.slice(8);
const START = startArg ?? releaseDateKey(new Date());
const DAYS = 365;

// Explicit rotation: no hero appears on consecutive days, including when the
// cycle wraps (…najdorf → kasparov…). New puzzles must be inserted with the
// same rule. Kept in sync with dist/puzzles by the check below.
// Days 1-7 are released history. Days 8-13: the six remaining heroes all
// debut before anyone repeats. Days 14-19: the repeats, still never adjacent.
const ORDER = [
  '0001-kasparov-topalov-1999',
  '0002-morphy-opera-1858',
  '0003-anderssen-immortal-1851',
  '0008-fischer-byrne-1956',
  '0007-marshall-levitsky-1912',
  '0009-carlsen-nepo-2021',
  '0004-anderssen-evergreen-1852',
  '0006-rubinstein-rotlewi-1907',
  '0013-canal-peruvian-1934',
  '0005-nimzowitsch-zugzwang-1923',
  '0012-meitner-hamppe-1872',
  '0014-najdorf-polish-1930',
  '0011-deepblue-kasparov-1996',
  '0010-kasparov-world-1999',
  '0017-carlsen-anand-2013-g5',
  '0016-kasparov-karpov-1985',
  '0019-carlsen-anand-2013-g9',
  '0015-fischer-spassky-1972',
  '0018-carlsen-karjakin-2016',
];

const onDisk = readdirSync(path.join(ROOT, 'dist/puzzles'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .sort();
if (onDisk.join() !== [...ORDER].sort().join()) {
  throw new Error('ORDER is out of sync with dist/puzzles — update the rotation');
}
const ids = ORDER;

const start = new Date(`${START}T00:00:00Z`);
const days = Array.from({ length: DAYS }, (_, i) => {
  const d = new Date(start.getTime() + i * 86_400_000);
  return { date: d.toISOString().slice(0, 10), puzzleId: ids[i % ids.length] };
});

const out = path.join(ROOT, 'content/calendar.json');
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ version: 1, days }, null, 2) + '\n');
console.log(`wrote ${out}: ${DAYS} days from ${START} cycling ${ids.length} puzzles`);
