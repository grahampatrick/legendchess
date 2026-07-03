import { z } from 'zod';

export const UCI_REGEX = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

const UciSchema = z.string().regex(UCI_REGEX, 'must be a UCI move like e2e4 or e7e8q');
const SanSchema = z.string().min(2);

const MoveSchema = z.object({
  uci: UciSchema,
  san: SanSchema,
});

const DecisionPointSchema = z.object({
  /** 1-based ply of the hero move, counted from the game's first move. */
  ply: z.number().int().positive(),
  /** The move the legend actually played. */
  hero: MoveSchema,
  /**
   * Centipawn eval for EVERY legal move in this position, from the hero's
   * perspective (higher = better for the hero). Mate in N is encoded as
   * ±(MATE_CP - N). Authored offline by forge — see ADR 0001.
   */
  evals: z.record(UciSchema, z.number().int()),
  /** The opponent's reply as played, or null when the hero move ends the window. */
  reply: MoveSchema.nullable(),
});

export const PuzzleSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[0-9]{4}-[a-z0-9-]+$/, 'e.g. 0001-kasparov-topalov-1999'),
  meta: z.object({
    /** Display title, e.g. "Kasparov's Immortal". */
    title: z.string().min(1),
    event: z.string().min(1),
    site: z.string().optional(),
    year: z.number().int().min(1475).max(2100),
    heroName: z.string().min(1),
    heroColor: z.enum(['white', 'black']),
    opponentName: z.string().min(1),
    result: z.enum(['1-0', '0-1', '1/2-1/2']),
    /** Original editorial framing — never copied from annotated sources. */
    blurb: z.string().min(1),
    /** Where the bare game score was sourced/verified. */
    sources: z.array(z.string().min(1)).min(1),
  }),
  /** SAN moves from the standard initial position up to startFen (for replay UX). */
  prelude: z.object({ san: z.array(SanSchema) }),
  /** Position at the first decision point; the hero is to move. */
  startFen: z.string().min(1),
  decisionPoints: z.array(DecisionPointSchema).min(1),
  /** SAN moves after the last decision point (and reply) to the end of the game. */
  finale: z.object({ san: z.array(SanSchema) }),
});

export type Puzzle = z.infer<typeof PuzzleSchema>;
export type DecisionPoint = z.infer<typeof DecisionPointSchema>;
export type PuzzleMove = z.infer<typeof MoveSchema>;

/** Mate-in-N is encoded in eval tables as ±(MATE_CP - N). */
export const MATE_CP = 100000;
