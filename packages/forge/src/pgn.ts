/**
 * Forge's chessops boundary for PGN ingestion (core's `chess.ts` is the
 * boundary for everything positional). We take bare movetext only — comments
 * and NAGs in source PGNs are annotations (copyrighted) and are dropped by
 * parsing; variations are ignored by walking the mainline.
 */
import { parsePgn } from 'chessops/pgn';

import { PgnParseError } from './errors.js';

export interface ParsedGame {
  headers: ReadonlyMap<string, string>;
  /** Mainline SAN, in ply order, without move numbers/comments/NAGs. */
  san: string[];
}

export const parseGame = (pgnText: string): ParsedGame => {
  const games = parsePgn(pgnText);
  const game = games[0];
  if (!game) throw new PgnParseError('No game found in PGN input');
  if (games.length > 1) {
    throw new PgnParseError(`Expected exactly one game per PGN file, found ${games.length}`);
  }
  const san = [...game.moves.mainline()].map((node) => node.san);
  if (san.length === 0) throw new PgnParseError('Game has no moves');
  return { headers: game.headers, san };
};
