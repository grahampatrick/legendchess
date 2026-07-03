import { describe, expect, it } from 'vitest';

import {
  IllegalMoveError,
  MalformedUciError,
  NoMoreHintsError,
  SessionCompleteError,
  createSession,
  emojiGrid,
  scoreSession,
  validatePuzzle,
} from '../src/index';
import { standardSynthetic } from './helpers/synthetic';

describe('synthetic puzzle integrity', () => {
  it('passes full validation', () => {
    expect(() => validatePuzzle(standardSynthetic())).not.toThrow();
  });
});

describe('grading', () => {
  it('grades the exact hero move 🟩 at full level', () => {
    const session = createSession(standardSynthetic());
    const outcome = session.guess('e2e4');
    expect(outcome).toEqual({ result: 'exact', livesLeft: 3, done: false });
    expect(session.state().records[0]?.resolved).toEqual({ result: 'exact', level: 3 });
  });

  it('grades a move within the cp threshold as equivalent, capped at 🟨', () => {
    const session = createSession(standardSynthetic());
    const outcome = session.guess('d2d4'); // Δ20 < 30
    expect(outcome.result).toBe('equivalent');
    expect(session.state().records[0]?.resolved).toEqual({ result: 'equivalent', level: 2 });
  });

  it('treats a delta of exactly the threshold as equivalent', () => {
    const session = createSession(standardSynthetic());
    expect(session.guess('g1f3').result).toBe('equivalent'); // Δ30 = threshold
  });

  it('treats one centipawn past the threshold as a miss', () => {
    const session = createSession(standardSynthetic());
    expect(session.guess('b1c3').result).toBe('miss'); // Δ31
  });

  it('grades a move BETTER than the hero move as equivalent', () => {
    const session = createSession(standardSynthetic());
    session.guess('e2e4');
    expect(session.guess('f1c4').result).toBe('equivalent'); // 45 > hero 40
  });

  it('continues the real game after an equivalent guess (history stays on rails)', () => {
    const session = createSession(standardSynthetic());
    session.guess('d2d4'); // equivalent — but the game must continue with 1.e4 e5
    expect(session.state().currentIndex).toBe(1);
    expect(session.state().fen).toContain('4p3'); // black pawn on e5, not d5
  });
});

describe('misses, lives, and auto-hints', () => {
  it('a miss costs a life and reveals the tier-1 hint (piece)', () => {
    const session = createSession(standardSynthetic());
    const outcome = session.guess('a2a3');
    expect(outcome.result).toBe('miss');
    expect(outcome.livesLeft).toBe(2);
    expect(outcome.hint).toEqual({ tier: 1, piece: 'pawn' });
    expect(outcome.done).toBe(false);
  });

  it('a second miss escalates to the tier-2 hint (destination square)', () => {
    const session = createSession(standardSynthetic());
    session.guess('a2a3');
    const outcome = session.guess('b2b3');
    expect(outcome.hint).toEqual({ tier: 2, to: 'e4' });
    expect(outcome.livesLeft).toBe(1);
  });

  it('solving after misses resolves at a downgraded level (🟥)', () => {
    const session = createSession(standardSynthetic());
    session.guess('a2a3');
    session.guess('b2b3');
    const outcome = session.guess('e2e4');
    expect(outcome.result).toBe('exact');
    expect(session.state().records[0]?.resolved).toEqual({ result: 'exact', level: 1 });
  });

  it('the third miss ends the game into spectator mode', () => {
    const session = createSession(standardSynthetic());
    session.guess('a2a3');
    session.guess('b2b3');
    const outcome = session.guess('h2h3');
    expect(outcome).toEqual({ result: 'miss', livesLeft: 0, done: true });
    const state = session.state();
    expect(state.phase).toBe('spectator');
    expect(state.records[0]?.resolved).toEqual({ result: 'failed', level: 0 });
    expect(state.records[1]?.resolved).toBeNull();
    expect(state.records[2]?.resolved).toBeNull();
  });

  it('rejects guesses and hints after the session ends', () => {
    const session = createSession(standardSynthetic());
    session.guess('a2a3');
    session.guess('b2b3');
    session.guess('h2h3');
    expect(() => session.guess('e2e4')).toThrow(SessionCompleteError);
    expect(() => session.requestHint()).toThrow(SessionCompleteError);
  });
});

describe('voluntary hints', () => {
  it('escalates tiers and downgrades the level, floored at 🟥', () => {
    const session = createSession(standardSynthetic());
    expect(session.requestHint()).toEqual({ tier: 1, piece: 'pawn' });
    expect(session.requestHint()).toEqual({ tier: 2, to: 'e4' });
    expect(session.requestHint()).toEqual({ tier: 3, uci: 'e2e4' });
    expect(() => session.requestHint()).toThrow(NoMoreHintsError);
    session.guess('e2e4');
    expect(session.state().records[0]?.resolved).toEqual({ result: 'exact', level: 1 });
    expect(session.state().livesLeft).toBe(3); // hints never cost lives
  });

  it('a hint then a miss escalates to tier 2, not tier 1 again', () => {
    const session = createSession(standardSynthetic());
    session.requestHint();
    const outcome = session.guess('a2a3');
    expect(outcome.hint).toEqual({ tier: 2, to: 'e4' });
  });
});

describe('input validation', () => {
  it('normalizes uppercase UCI', () => {
    const session = createSession(standardSynthetic());
    expect(session.guess('E2E4').result).toBe('exact');
  });

  it('throws MalformedUciError for non-UCI input', () => {
    const session = createSession(standardSynthetic());
    expect(() => session.guess('Nf3')).toThrow(MalformedUciError);
    expect(() => session.guess('e2e9')).toThrow(MalformedUciError);
  });

  it('throws IllegalMoveError for well-formed but illegal moves', () => {
    const session = createSession(standardSynthetic());
    expect(() => session.guess('e2e5')).toThrow(IllegalMoveError);
    expect(session.state().livesLeft).toBe(3); // illegal input is not a miss
  });
});

describe('completion, scoring, and share grid', () => {
  it('a perfect run solves the puzzle at full score with the finale played out', () => {
    const session = createSession(standardSynthetic());
    session.guess('e2e4');
    session.guess('g1f3');
    const last = session.guess('f1b5');
    expect(last.done).toBe(true);
    const state = session.state();
    expect(state.phase).toBe('solved');
    expect(emojiGrid(state.records)).toBe('🟩🟩🟩');
    expect(scoreSession(state.records)).toBe(300);
    // Finale 3...a6 4.Ba4 was auto-played: bishop ends on a4, black pawn on a6.
    expect(state.fen).toBe('r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 1 4');
  });

  it('mixed outcomes produce the right grid and score', () => {
    const session = createSession(standardSynthetic());
    session.guess('d2d4'); // equivalent → 🟨 60
    session.guess('a2a3'); // miss (one downgrade)
    session.guess('g1f3'); // exact after one miss → 🟨 60
    session.guess('f1b5'); // exact → 🟩 100
    const state = session.state();
    expect(emojiGrid(state.records)).toBe('🟨🟨🟩');
    expect(scoreSession(state.records)).toBe(220);
  });

  it('state snapshots are defensive copies', () => {
    const session = createSession(standardSynthetic());
    const state = session.state();
    state.records[0]!.resolved = { result: 'exact', level: 3 };
    expect(session.state().records[0]?.resolved).toBeNull();
  });

  it('exposes legal moves for the UI (20 at the initial position)', () => {
    const session = createSession(standardSynthetic());
    const moves = session.legalMoves();
    expect(moves).toHaveLength(20);
    expect(moves).toContain('e2e4');
  });
});
