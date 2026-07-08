import { ImageResponse } from 'next/og';

import { loadCalendar } from '../lib/calendar.server';
import { entryForNow } from '../lib/daily';
import { loadPuzzle } from '../lib/puzzles.server';

export const runtime = 'nodejs';
export const alt = 'LegendChess — the daily chess game';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Satori rules: every multi-child div needs explicit display:flex, and glyphs
// outside the bundled font (e.g. ♞) trigger a remote font fetch — text only.
export default async function OgImage() {
  const entry = entryForNow(await loadCalendar(), new Date());
  const puzzle = entry ? await loadPuzzle(entry.puzzleId) : null;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#161512',
        color: '#efefef',
        gap: 28,
      }}
    >
      <div style={{ display: 'flex', fontSize: 54, color: '#7cb342' }}>LEGENDCHESS</div>
      <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, textAlign: 'center' }}>
        {puzzle && entry ? `Day ${entry.dayNumber}: ${puzzle.meta.title}` : 'The daily chess game'}
      </div>
      <div style={{ display: 'flex', fontSize: 40, color: '#bababa' }}>
        {puzzle
          ? `You are ${puzzle.meta.heroName} - ${puzzle.meta.event}, ${puzzle.meta.year}`
          : 'Find the moves the legends actually played.'}
      </div>
      <div style={{ display: 'flex', fontSize: 30, color: '#787878' }}>
        3 lives · 10 moves · one game a day
      </div>
    </div>,
    size,
  );
}
