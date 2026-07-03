/**
 * Server-side result verification (ADR 0006): replay a submitted action log
 * through the SAME core session the client played — one ruleset
 * implementation graded three ways (client, tests, server). The client's
 * claimed score is never read, let alone trusted.
 */
import {
  PlayTheLegendError,
  createSession,
  emojiGrid,
  scoreSession,
  type Puzzle,
} from '@playthelegend/core';
import { z } from 'zod';

export const ActionLogSchema = z
  .array(
    z.discriminatedUnion('type', [
      z.object({ type: z.literal('guess'), uci: z.string().max(5) }),
      z.object({ type: z.literal('hint') }),
    ]),
  )
  .max(200); // generous ceiling; a legitimate game is < 50 actions

export type SubmittedAction = z.infer<typeof ActionLogSchema>[number];

export class VerificationError extends PlayTheLegendError {}

export interface VerifiedResult {
  score: number;
  grid: string;
  livesLeft: number;
  solved: boolean;
}

export const verifySubmission = (puzzle: Puzzle, actions: SubmittedAction[]): VerifiedResult => {
  const session = createSession(puzzle);
  for (const [i, action] of actions.entries()) {
    if (session.state().phase !== 'playing') {
      throw new VerificationError(`action ${i} arrives after the game ended`);
    }
    try {
      if (action.type === 'hint') session.requestHint();
      else session.guess(action.uci);
    } catch (e) {
      throw new VerificationError(`action ${i} does not replay: ${String(e)}`);
    }
  }
  const state = session.state();
  if (state.phase === 'playing') {
    throw new VerificationError('the action log does not finish the game');
  }
  return {
    score: scoreSession(state.records),
    grid: emojiGrid(state.records),
    livesLeft: state.livesLeft,
    solved: state.phase === 'solved',
  };
};
