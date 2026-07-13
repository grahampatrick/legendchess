/**
 * The 8-bit heart bitmap shared by the lives HUD (SVG) and the story card
 * (canvas). Cells: '.' empty · '1' outline · '2' fill · '3' highlight.
 * The share TEXT keeps core's ❤/♡ characters — that format is locked.
 */
export const HEART_ROWS = [
  '..111...111..',
  '.12221.12221.',
  '1232221222221',
  '1332222222221',
  '1322222222221',
  '.12222222221.',
  '..122222221..',
  '...1222221...',
  '....12221....',
  '.....121.....',
  '......1......',
] as const;

export const HEART_COLS = HEART_ROWS[0].length;

export const HEART_COLORS = {
  full: { '1': '#141210', '2': '#e2504c', '3': '#f4837f' },
  spent: { '1': '#141210', '2': '#3a3835', '3': '#46433c' },
} as const;

export type HeartCell = '1' | '2' | '3';
