import {
  fenOf,
  initialPosition,
  legalUcis,
  playSan,
  playUci,
  positionFromFen,
  sanOfUci,
  turnOf,
} from './chess.js';
import { PuzzleDataError } from './errors.js';
import { PuzzleSchema, type Puzzle } from './schema.js';

/**
 * Full integrity check beyond zod shape validation: the prelude must replay to
 * startFen, every decision point's eval table must cover exactly the legal
 * moves, hero/reply moves must be legal and SAN-consistent, and the finale
 * must replay to the end. Forge runs this before a puzzle may ship; tests run
 * it on every fixture. Throws PuzzleDataError with a precise message.
 */
export const validatePuzzle = (input: unknown): Puzzle => {
  const puzzle = PuzzleSchema.parse(input);

  // 1. Prelude replays from the standard start to startFen.
  const pos = initialPosition();
  for (const [i, san] of puzzle.prelude.san.entries()) {
    try {
      playSan(pos, san);
    } catch (e) {
      throw new PuzzleDataError(`Prelude move ${i + 1} ("${san}") does not replay: ${String(e)}`);
    }
  }
  if (fenOf(pos) !== puzzle.startFen) {
    throw new PuzzleDataError(
      `Prelude ends at "${fenOf(pos)}" but startFen is "${puzzle.startFen}"`,
    );
  }

  // 2. Decision points: hero to move, eval coverage, SAN/UCI agreement, replies.
  let expectedPly = puzzle.prelude.san.length + 1;
  for (const dp of puzzle.decisionPoints) {
    if (turnOf(pos) !== puzzle.meta.heroColor) {
      throw new PuzzleDataError(`At ply ${dp.ply} it is not the hero's move`);
    }
    if (dp.ply !== expectedPly) {
      throw new PuzzleDataError(`Decision point ply ${dp.ply} out of sequence (expected ${expectedPly})`);
    }

    const legal = legalUcis(pos).sort();
    const listed = Object.keys(dp.evals).sort();
    if (legal.length !== listed.length || legal.some((uci, i) => uci !== listed[i])) {
      const missing = legal.filter((u) => !(u in dp.evals));
      const extra = listed.filter((u) => !legal.includes(u));
      throw new PuzzleDataError(
        `Eval table at ply ${dp.ply} does not cover the legal moves exactly` +
          (missing.length ? `; missing: ${missing.join(', ')}` : '') +
          (extra.length ? `; not legal: ${extra.join(', ')}` : ''),
      );
    }

    if (sanOfUci(pos, dp.hero.uci) !== dp.hero.san) {
      throw new PuzzleDataError(
        `Hero move at ply ${dp.ply}: UCI ${dp.hero.uci} is not SAN "${dp.hero.san}"`,
      );
    }
    playUci(pos, dp.hero.uci);
    expectedPly += 1;

    if (dp.reply) {
      if (sanOfUci(pos, dp.reply.uci) !== dp.reply.san) {
        throw new PuzzleDataError(
          `Reply after ply ${dp.ply}: UCI ${dp.reply.uci} is not SAN "${dp.reply.san}"`,
        );
      }
      playUci(pos, dp.reply.uci);
      expectedPly += 1;
    }
  }

  // 3. Finale replays.
  for (const [i, san] of puzzle.finale.san.entries()) {
    try {
      playSan(pos, san);
    } catch (e) {
      throw new PuzzleDataError(`Finale move ${i + 1} ("${san}") does not replay: ${String(e)}`);
    }
  }

  // 4. The last decision point must have a reply or a finale only if the game
  //    continues; nothing to check here beyond replayability — result is metadata.
  void positionFromFen(puzzle.startFen); // startFen itself must be a legal position.

  return puzzle;
};
