/**
 * Instagram-story share card (1080×1920), rendered client-side on a canvas —
 * no server, no fonts to ship, no likenesses (the knight and the grid are the
 * brand; portraits stay editorial on /legends). The share sheet on mobile
 * offers Instagram Stories directly; desktop falls back to a PNG download.
 */

import { HEART_COLORS, HEART_COLS, HEART_ROWS, type HeartCell } from './pixelHeart';

export interface StoryCardInput {
  title: string;
  heroName: string;
  event: string;
  year: number;
  dayNumber?: number;
  /** Emoji grid string (🟩🟨🟥⬛), one per decision point. */
  grid: string;
  score: number;
  max: number;
  livesLeft: number;
  solved: boolean;
}

const W = 1080;
const H = 1920;
const BG = '#1b1a17';
const CARD = '#262421';
const TEXT = '#efefef';
const DIM = '#9f9c97';
const ACCENT = '#7cb342';
const TILE: Record<string, string> = {
  '🟩': '#7cb342',
  '🟨': '#d6a000',
  '🟥': '#cc4b3b',
  '⬛': '#3a3835',
};

const wrap = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const probe = line ? `${line} ${word}` : word;
    if (ctx.measureText(probe).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = probe;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const rounded = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
};

export const renderStoryCard = async (input: StoryCardInput): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const font = (px: number, weight = 400) =>
    `${weight} ${px}px -apple-system, "Segoe UI", Roboto, sans-serif`;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';

  // Wordmark
  ctx.font = font(64, 700);
  const mark = '♞ LegendChess';
  const markW = ctx.measureText(mark).width;
  ctx.fillStyle = ACCENT;
  ctx.fillText('♞', W / 2 - markW / 2 + 20, 320);
  ctx.fillStyle = TEXT;
  ctx.fillText('LegendChess', W / 2 + 44, 320);

  // Day + game
  ctx.fillStyle = DIM;
  ctx.font = font(44);
  const dayTag = input.dayNumber !== undefined ? `#${input.dayNumber} · ` : '';
  ctx.fillText(`${dayTag}${input.title}`, W / 2, 470);
  ctx.fillText(`${input.event} · ${input.year}`, W / 2, 535);

  // Headline
  const lastName = input.heroName.split(' ').at(-1) ?? input.heroName;
  const headline = input.solved ? `I played like ${lastName}.` : `${lastName} finished without me.`;
  ctx.fillStyle = TEXT;
  ctx.font = font(88, 700);
  const lines = wrap(ctx, headline, W - 160);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 720 + i * 108));
  let y = 720 + lines.length * 108 + 60;

  // Grid tiles
  const tiles = Array.from(input.grid);
  const gap = 14;
  const size = Math.min(96, Math.floor((W - 200 - gap * (tiles.length - 1)) / tiles.length));
  const total = tiles.length * size + (tiles.length - 1) * gap;
  tiles.forEach((emoji, i) => {
    ctx.fillStyle = TILE[emoji] ?? TILE['⬛']!;
    rounded(ctx, W / 2 - total / 2 + i * (size + gap), y, size, size, 18);
  });
  y += size + 130;

  // Score + hearts
  ctx.fillStyle = TEXT;
  ctx.font = font(104, 700);
  ctx.fillText(`${input.score} / ${input.max}`, W / 2, y);
  drawPixelHearts(ctx, input.livesLeft, 5, W / 2, y + 44);
  y += 240;

  // Challenge line in a card
  ctx.fillStyle = CARD;
  rounded(ctx, 120, y, W - 240, 150, 24);
  ctx.fillStyle = DIM;
  ctx.font = font(42);
  ctx.fillText(`How many of ${lastName}'s moves can you find?`, W / 2, y + 92);

  // Footer
  ctx.fillStyle = ACCENT;
  ctx.font = font(56, 700);
  ctx.fillText('legendchess.com', W / 2, H - 260);
  ctx.fillStyle = DIM;
  ctx.font = font(40);
  ctx.fillText('one legendary game a day', W / 2, H - 195);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas export failed'))), 'image/png');
  });
};

/** Share the card via the native sheet (mobile → Instagram Stories) or download. */
export const shareStoryCard = async (input: StoryCardInput): Promise<'shared' | 'downloaded'> => {
  const blob = await renderStoryCard(input);
  const file = new File(
    [blob],
    `legendchess${input.dayNumber ? `-day-${input.dayNumber}` : ''}.png`,
    {
      type: 'image/png',
    },
  );
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch {
      /* user cancelled the sheet — fall through to download */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
};

/** The lives row as 8-bit hearts — same bitmap as the in-game HUD. */
function drawPixelHearts(
  ctx: CanvasRenderingContext2D,
  livesLeft: number,
  total: number,
  centerX: number,
  top: number,
) {
  const px = 6;
  const gap = 22;
  const heartW = HEART_COLS * px;
  const rowW = total * heartW + (total - 1) * gap;
  for (let i = 0; i < total; i++) {
    const palette = i < livesLeft ? HEART_COLORS.full : HEART_COLORS.spent;
    const x0 = centerX - rowW / 2 + i * (heartW + gap);
    HEART_ROWS.forEach((row, cy) => {
      for (let cx = 0; cx < row.length; cx++) {
        const cell = row[cx];
        if (cell === '.') continue;
        ctx.fillStyle = palette[cell as HeartCell];
        // +0.5 oversize hides antialiasing seams between cells.
        ctx.fillRect(x0 + cx * px, top + cy * px, px + 0.5, px + 0.5);
      }
    });
  }
}
