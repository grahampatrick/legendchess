import {
  fenOf,
  legalUcis,
  normalizeUci,
  playSan,
  playUci,
  positionFromFen,
  roleAtFrom,
  toSquareOf,
  type Position,
  type Role,
} from './chess.js';
import {
  IllegalMoveError,
  NoMoreHintsError,
  PuzzleDataError,
  SessionCompleteError,
} from './errors.js';
import { RULES, type Rules } from './rules.js';
import type { DecisionPoint, Puzzle } from './schema.js';

export type GuessResult = 'exact' | 'equivalent' | 'miss';
export type Phase = 'playing' | 'solved' | 'spectator';
export type Level = 0 | 1 | 2 | 3;

export type Hint = { tier: 1; piece: Role } | { tier: 2; to: string } | { tier: 3; uci: string };

export interface PointRecord {
  /** Index into puzzle.decisionPoints. */
  index: number;
  ply: number;
  misses: number;
  hintsRevealed: number;
  /** null while unresolved (still guessing, or never reached as a spectator). */
  resolved: { result: 'exact' | 'equivalent' | 'failed'; level: Level } | null;
}

export interface GuessOutcome {
  result: GuessResult;
  livesLeft: number;
  /** Auto-revealed on a miss (escalating tier); absent otherwise. */
  hint?: Hint;
  /** True when the session ended with this guess (solved or out of lives). */
  done: boolean;
}

export interface SessionState {
  phase: Phase;
  livesLeft: number;
  /** Index of the current decision point (clamped to the last one after finish). */
  currentIndex: number;
  fen: string;
  records: readonly PointRecord[];
}

export interface Session {
  readonly puzzle: Puzzle;
  readonly rules: Rules;
  /** Immutable snapshot of the current state. */
  state(): SessionState;
  /** Legal moves (UCI) in the current position — feed chessground dests from this. */
  legalMoves(): string[];
  guess(rawUci: string): GuessOutcome;
  /** Voluntarily reveal the next hint tier (downgrades the point's level). */
  requestHint(): Hint;
}

const hintForTier = (tier: 1 | 2 | 3, pos: Position, dp: DecisionPoint): Hint => {
  switch (tier) {
    case 1:
      return { tier, piece: roleAtFrom(pos, dp.hero.uci) };
    case 2:
      return { tier, to: toSquareOf(dp.hero.uci) };
    case 3:
      return { tier, uci: dp.hero.uci };
  }
};

/**
 * The one and only implementation of the ruleset (ADR 0004).
 * Pure and synchronous: no DOM, no network, no clock, no randomness.
 */
export const createSession = (puzzle: Puzzle, rules: Rules = RULES): Session => {
  const pos = positionFromFen(puzzle.startFen);
  let phase: Phase = 'playing';
  let lives = rules.lives;
  let index = 0;

  const records: PointRecord[] = puzzle.decisionPoints.map((dp, i) => ({
    index: i,
    ply: dp.ply,
    misses: 0,
    hintsRevealed: 0,
    resolved: null,
  }));

  /** Level the current point would resolve at, given misses + hints so far. */
  const currentLevel = (record: PointRecord): Level => {
    const downgrades = record.misses + record.hintsRevealed;
    return Math.max(1, 3 - downgrades) as Level;
  };

  const current = (): { dp: DecisionPoint; record: PointRecord } => {
    const dp = puzzle.decisionPoints[index];
    const record = records[index];
    if (!dp || !record) throw new PuzzleDataError(`No decision point at index ${index}`);
    return { dp, record };
  };

  const advance = (dp: DecisionPoint): void => {
    playUci(pos, dp.hero.uci);
    if (dp.reply) playUci(pos, dp.reply.uci);
    index += 1;
    if (index >= puzzle.decisionPoints.length) {
      phase = 'solved';
      index = puzzle.decisionPoints.length - 1;
      // Play out the finale so state().fen ends on the final position.
      for (const san of puzzle.finale.san) playSan(pos, san);
    }
  };

  return {
    puzzle,
    rules,

    state: (): SessionState => ({
      phase,
      livesLeft: lives,
      currentIndex: index,
      fen: fenOf(pos),
      records: records.map((r) => ({ ...r, resolved: r.resolved ? { ...r.resolved } : null })),
    }),

    legalMoves: (): string[] => legalUcis(pos),

    guess: (rawUci: string): GuessOutcome => {
      if (phase !== 'playing') throw new SessionCompleteError();
      const uci = normalizeUci(rawUci);
      if (!legalUcis(pos).includes(uci)) throw new IllegalMoveError(uci, fenOf(pos));

      const { dp, record } = current();

      if (uci === dp.hero.uci) {
        record.resolved = { result: 'exact', level: currentLevel(record) };
        advance(dp);
        return { result: 'exact', livesLeft: lives, done: phase !== 'playing' };
      }

      const heroCp = dp.evals[dp.hero.uci];
      const guessCp = dp.evals[uci];
      if (heroCp === undefined || guessCp === undefined) {
        throw new PuzzleDataError(
          `Eval table for ply ${dp.ply} is missing ${heroCp === undefined ? dp.hero.uci : uci}`,
        );
      }

      if (guessCp >= heroCp - rules.cpEquivalenceThreshold) {
        record.resolved = {
          result: 'equivalent',
          level: Math.min(currentLevel(record), 2) as Level,
        };
        advance(dp);
        return { result: 'equivalent', livesLeft: lives, done: phase !== 'playing' };
      }

      // Miss: lose a life, escalate the hint, retry (or die into spectator mode).
      record.misses += 1;
      lives -= 1;
      if (lives <= 0) {
        record.resolved = { result: 'failed', level: 0 };
        phase = 'spectator';
        return { result: 'miss', livesLeft: 0, done: true };
      }
      const tier = Math.min(3, record.hintsRevealed + record.misses) as 1 | 2 | 3;
      return { result: 'miss', livesLeft: lives, hint: hintForTier(tier, pos, dp), done: false };
    },

    requestHint: (): Hint => {
      if (phase !== 'playing') throw new SessionCompleteError();
      const { dp, record } = current();
      const tier = record.hintsRevealed + record.misses + 1;
      if (tier > 3) throw new NoMoreHintsError();
      record.hintsRevealed += 1;
      return hintForTier(tier as 1 | 2 | 3, pos, dp);
    },
  };
};
