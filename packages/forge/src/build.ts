/**
 * Pure assembly: PGN + curation config + an injected MoveEvaluator → a
 * validated Puzzle. All engine I/O stays behind the MoveEvaluator interface
 * so tests can substitute a fake and goldens can pin a real engine.
 */
import {
  PuzzleDataError,
  fenOf,
  initialPosition,
  legalUcis,
  playUci,
  sanOfUci,
  uciOfSan,
  validatePuzzle,
  type Puzzle,
} from '@playthelegend/core';

import type { CurationConfig } from './config.js';
import type { MoveEvaluator } from './engine.js';
import { CurationError } from './errors.js';
import type { ParsedGame } from './pgn.js';

interface ReplayedPly {
  san: string;
  uci: string;
  /** FEN before this ply. */
  fenBefore: string;
  /** Legal UCI moves before this ply. */
  legal: string[];
}

const replay = (san: string[]): ReplayedPly[] => {
  const pos = initialPosition();
  return san.map((s) => {
    const fenBefore = fenOf(pos);
    const legal = legalUcis(pos);
    const uci = uciOfSan(pos, s);
    const canonical = sanOfUci(pos, uci); // normalize over-specified source SAN
    playUci(pos, uci);
    return { san: canonical, uci, fenBefore, legal };
  });
};

/** Hero full-move number → 1-based ply. */
export const heroPly = (move: number, color: 'white' | 'black'): number =>
  color === 'white' ? 2 * move - 1 : 2 * move;

const yearFromHeaders = (headers: ReadonlyMap<string, string>): number | undefined => {
  const date = headers.get('Date') ?? headers.get('EventDate');
  const year = Number(date?.slice(0, 4));
  return Number.isFinite(year) ? year : undefined;
};

export interface BuildInput {
  game: ParsedGame;
  config: CurationConfig;
  evaluate: MoveEvaluator;
}

export const buildPuzzle = async ({ game, config, evaluate }: BuildInput): Promise<Puzzle> => {
  const { headers, san } = game;
  const { heroColor, heroName, window } = config;

  // Guard: the configured hero must actually be the configured color.
  const colorHeader = headers.get(heroColor === 'white' ? 'White' : 'Black') ?? '';
  if (!colorHeader.toLowerCase().includes(heroName.split(' ').at(-1)!.toLowerCase())) {
    throw new CurationError(
      `Hero "${heroName}" does not match the ${heroColor} player header "${colorHeader}"`,
    );
  }
  const opponentHeader = headers.get(heroColor === 'white' ? 'Black' : 'White');

  const plies = replay(san); // throws PuzzleDataError on any illegal SAN
  const firstPly = heroPly(window.fromMove, heroColor);
  const lastPly = heroPly(window.toMove, heroColor);
  if (lastPly > san.length) {
    throw new CurationError(
      `Window ends at ply ${lastPly} but the game has only ${san.length} plies`,
    );
  }

  const decisionPoints: Puzzle['decisionPoints'] = [];
  for (let ply = firstPly; ply <= lastPly; ply += 2) {
    const hero = plies[ply - 1]!;
    const reply = plies[ply] ?? null;
    const evals = await evaluate(hero.fenBefore);
    const missing = hero.legal.filter((u) => !(u in evals));
    const extra = Object.keys(evals).filter((u) => !hero.legal.includes(u));
    if (missing.length || extra.length) {
      throw new PuzzleDataError(
        `Eval coverage mismatch at ply ${ply}` +
          (missing.length ? `; missing: ${missing.join(', ')}` : '') +
          (extra.length ? `; not legal: ${extra.join(', ')}` : ''),
      );
    }
    decisionPoints.push({
      ply,
      hero: { uci: hero.uci, san: hero.san },
      evals,
      reply: reply ? { uci: reply.uci, san: reply.san } : null,
    });
  }

  const lastIncludedPly = Math.min(lastPly + 1, san.length); // hero move + reply if present
  const year = config.overrides?.year ?? yearFromHeaders(headers);
  if (year === undefined) {
    throw new CurationError('No year in PGN headers; set overrides.year in the curation config');
  }
  const result = headers.get('Result');
  if (result !== '1-0' && result !== '0-1' && result !== '1/2-1/2') {
    throw new CurationError(`PGN Result header must be decisive or draw, got "${result}"`);
  }

  const puzzle: Puzzle = {
    schemaVersion: 1,
    id: config.id,
    meta: {
      title: config.title,
      event: config.overrides?.event ?? headers.get('Event') ?? 'Unknown event',
      ...((config.overrides?.site ?? headers.get('Site'))
        ? { site: config.overrides?.site ?? headers.get('Site') }
        : {}),
      year,
      heroName,
      heroColor,
      opponentName: config.overrides?.opponentName ?? opponentHeader ?? 'Unknown opponent',
      result,
      blurb: config.blurb,
      sources: config.sources,
    },
    prelude: { san: plies.slice(0, firstPly - 1).map((p) => p.san) },
    startFen: plies[firstPly - 1]!.fenBefore,
    decisionPoints,
    finale: { san: plies.slice(lastIncludedPly).map((p) => p.san) },
  };

  return validatePuzzle(puzzle); // the build itself must pass the gate
};

/** Deterministic serialization: sorted eval keys are handled at build time. */
export const puzzleToJson = (puzzle: Puzzle): string => JSON.stringify(puzzle, null, 2) + '\n';
