'use client';

/**
 * The done-card moment: grid tiles flip in one by one (very Wordle), the
 * score counts up beneath them, and a solved game gets a confetti burst.
 * Pure CSS + rAF — no dependencies. The share click lands on the peak.
 */
import { useEffect, useMemo, useState } from 'react';

const TILE_STAGGER_MS = 130;

export function GridReveal({ grid }: { grid: string }) {
  const tiles = useMemo(() => Array.from(grid), [grid]);
  return (
    <div className="result-grid" data-testid="grid" aria-label={grid}>
      {tiles.map((emoji, i) => (
        <span key={i} className="tile-flip" style={{ animationDelay: `${i * TILE_STAGGER_MS}ms` }}>
          {emoji}
        </span>
      ))}
    </div>
  );
}

export function CountUp({ to, max, suffix }: { to: number; max: number; suffix: React.ReactNode }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const duration = 900;
    let raf = 0;
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      setValue(Math.round(to * (1 - Math.pow(1 - t, 3)))); // ease-out cubic
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return (
    <span data-testid="final-score">
      {value} / {max} · {suffix}
    </span>
  );
}

const CONFETTI_COLORS = ['#7cb342', '#d6a000', '#efefef', '#629924', '#f0d9b5'];

export function Confetti({ count = 44 }: { count?: number }) {
  // Deterministic pseudo-random spread — no Math.random in render paths.
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        delay: `${((i * 53) % 40) / 100}s`,
        duration: `${1.6 + ((i * 29) % 90) / 100}s`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        spin: (i * 61) % 360,
      })),
    [count],
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            background: p.color,
            transform: `rotate(${p.spin}deg)`,
          }}
        />
      ))}
    </div>
  );
}
