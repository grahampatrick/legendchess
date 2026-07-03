import { z } from 'zod';

/**
 * The curation config a contributor writes next to a bare `game.pgn`.
 * Everything content-editorial lives here; everything factual comes from the
 * PGN headers (with optional overrides for sloppy header data).
 */
export const CurationConfigSchema = z.object({
  /** Puzzle id and output filename, e.g. "0001-kasparov-topalov-1999". */
  id: z.string().regex(/^[0-9]{4}-[a-z0-9-]+$/),
  /** Display title, e.g. "Kasparov's Immortal". */
  title: z.string().min(1),
  /** Must match the White or Black header (case-insensitive substring). */
  heroName: z.string().min(1),
  heroColor: z.enum(['white', 'black']),
  /** Hero decision window in the hero's own full-move numbers, inclusive. */
  window: z
    .object({
      fromMove: z.number().int().positive(),
      toMove: z.number().int().positive(),
    })
    .refine((w) => w.toMove >= w.fromMove, 'toMove must be >= fromMove'),
  /** Original editorial framing — never copied from annotated sources. */
  blurb: z.string().min(1),
  /** Where the bare game score was sourced/verified. */
  sources: z.array(z.string().min(1)).min(1),
  /** Optional overrides when PGN headers are missing or ugly. */
  overrides: z
    .object({
      event: z.string().optional(),
      site: z.string().optional(),
      year: z.number().int().optional(),
      opponentName: z.string().optional(),
    })
    .optional(),
});

export type CurationConfig = z.infer<typeof CurationConfigSchema>;
