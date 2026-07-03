/**
 * The shipping gate (ADR 0003): a puzzle may only reach dist/ if it passes
 * core's full replay validation AND plays through the real session machine on
 * the exact path to a solved, full-score finish.
 */
import {
  RULES,
  createSession,
  scoreSession,
  validatePuzzle,
  type Puzzle,
} from '@playthelegend/core';

import { PuzzleDataError } from '@playthelegend/core';
import { lintPuzzle, type LintWarning } from './lint.js';

export interface GateResult {
  puzzle: Puzzle;
  warnings: LintWarning[];
}

export const gatePuzzle = (input: unknown): GateResult => {
  const puzzle = validatePuzzle(input);

  const session = createSession(puzzle);
  for (const dp of puzzle.decisionPoints) {
    const outcome = session.guess(dp.hero.uci);
    if (outcome.result !== 'exact') {
      throw new PuzzleDataError(
        `Exact-path playthrough failed at ply ${dp.ply}: got "${outcome.result}"`,
      );
    }
  }
  const state = session.state();
  if (state.phase !== 'solved') {
    throw new PuzzleDataError(`Exact-path playthrough ended in phase "${state.phase}"`);
  }
  const score = scoreSession(state.records);
  const max = puzzle.decisionPoints.length * RULES.pointsByLevel[3];
  if (score !== max) {
    throw new PuzzleDataError(`Exact-path playthrough scored ${score}/${max}`);
  }

  return { puzzle, warnings: lintPuzzle(puzzle) };
};
