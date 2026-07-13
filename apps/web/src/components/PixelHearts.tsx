import { HEART_COLORS, HEART_ROWS, type HeartCell } from '../lib/pixelHeart';

function Heart({ spent }: { spent: boolean }) {
  const palette = spent ? HEART_COLORS.spent : HEART_COLORS.full;
  const rects: React.ReactNode[] = [];
  HEART_ROWS.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === '.') return;
      rects.push(
        // 1.03 oversize hides antialiasing seams between adjacent cells.
        <rect
          key={`${x}.${y}`}
          x={x}
          y={y}
          width={1.03}
          height={1.03}
          fill={palette[cell as HeartCell]}
        />,
      );
    });
  });
  return (
    <svg viewBox={`0 0 ${HEART_ROWS[0].length} ${HEART_ROWS.length}`} aria-hidden="true">
      {rects}
    </svg>
  );
}

/** 8-bit lives row: full hearts first, spent hearts hollow out in sequence. */
export function PixelHearts({ livesLeft, total }: { livesLeft: number; total: number }) {
  return (
    <span className="pixel-hearts">
      {Array.from({ length: total }, (_, i) => (
        <Heart key={i} spent={i >= livesLeft} />
      ))}
    </span>
  );
}
