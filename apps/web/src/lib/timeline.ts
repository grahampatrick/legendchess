/**
 * Pure frame builders for board animation: prelude replay, post-guess reveal,
 * spectator/finale playback. All rules work happens in core; this only walks
 * positions and emits FEN frames.
 */
import { fenOf, initialPosition, playSan, positionFromFen, type Puzzle } from '@legendchess/core';

export interface Frame {
  fen: string;
  /** [from, to] of the move that produced this frame. */
  lastMove?: [string, string];
  san?: string;
}

const uciEnds = (uci: string): [string, string] => [uci.slice(0, 2), uci.slice(2, 4)];

/** Initial position through every prelude move; last frame's fen === startFen. */
export const preludeFrames = (puzzle: Puzzle): Frame[] => {
  const pos = initialPosition();
  const frames: Frame[] = [{ fen: fenOf(pos) }];
  for (const san of puzzle.prelude.san) {
    const uci = playSan(pos, san);
    frames.push({ fen: fenOf(pos), lastMove: uciEnds(uci), san });
  }
  return frames;
};

/** Frames for a SAN sequence starting from a given fen (first frame excluded). */
export const framesFromSan = (startFen: string, san: readonly string[]): Frame[] => {
  const pos = positionFromFen(startFen);
  return san.map((s) => {
    const uci = playSan(pos, s);
    return { fen: fenOf(pos), lastMove: uciEnds(uci), san: s };
  });
};

/**
 * Everything that remains from decision point `fromIndex` to the end of the
 * game (hero moves, replies, finale) — used for spectator playback and the
 * post-solve finale. `fromFen` is the position before the hero move at
 * `fromIndex` (or before the finale when fromIndex === decisionPoints.length).
 */
export const remainderFrames = (puzzle: Puzzle, fromIndex: number, fromFen: string): Frame[] => {
  const san: string[] = [];
  for (const dp of puzzle.decisionPoints.slice(fromIndex)) {
    san.push(dp.hero.san);
    if (dp.reply) san.push(dp.reply.san);
  }
  san.push(...puzzle.finale.san);
  return framesFromSan(fromFen, san);
};

/** The two-frame reveal after a resolved guess: hero move, then the reply. */
export const revealFrames = (puzzle: Puzzle, index: number, beforeFen: string): Frame[] => {
  const dp = puzzle.decisionPoints[index];
  if (!dp) return [];
  const san = dp.reply ? [dp.hero.san, dp.reply.san] : [dp.hero.san];
  return framesFromSan(beforeFen, san);
};
