/**
 * Thin wrappers around chessops so the rest of core (and downstream packages)
 * never touch raw rules-library APIs. This is the ONLY file allowed to import
 * from 'chessops' — one library boundary, one place to swap it.
 */
import { Chess, castlingSide } from 'chessops/chess';
import { INITIAL_FEN, makeFen, parseFen } from 'chessops/fen';
import { makeSan, parseSan } from 'chessops/san';
import {
  kingCastlesTo,
  makeSquare,
  makeUci,
  parseUci,
  squareFile,
  squareRank,
} from 'chessops/util';
import type { Move, Role } from 'chessops/types';

import { IllegalMoveError, MalformedUciError, PuzzleDataError } from './errors.js';
import { UCI_REGEX } from './schema.js';

export type Position = Chess;
export type { Role };

export const initialPosition = (): Position => Chess.default();

export const positionFromFen = (fen: string): Position => {
  const setup = parseFen(fen).unwrap(
    (s) => s,
    (e) => {
      throw new PuzzleDataError(`Invalid FEN "${fen}": ${e.message}`);
    },
  );
  return Chess.fromSetup(setup).unwrap(
    (p) => p,
    (e) => {
      throw new PuzzleDataError(`Illegal position "${fen}": ${e.message}`);
    },
  );
};

export const fenOf = (pos: Position): string => makeFen(pos.toSetup());

export const turnOf = (pos: Position): 'white' | 'black' => pos.turn;

/**
 * UCI convention note: chessops encodes castling as king-takes-rook (e1h1,
 * the Chess960-safe lichess form); standard UCI engines and this project's
 * puzzle format use the classical form (e1g1). These two helpers convert at
 * the boundary so every UCI string outside this file is engine-convention.
 */
const toEngineUci = (pos: Position, move: Move): string => {
  const side = castlingSide(pos, move);
  if (side && 'from' in move)
    return makeUci({ from: move.from, to: kingCastlesTo(pos.turn, side) });
  return makeUci(move);
};

const moveFromEngineUci = (pos: Position, uci: string): Move | undefined => {
  const move = parseUci(uci);
  if (!move || !('from' in move) || move.promotion) return move;
  const piece = pos.board.get(move.from);
  if (piece?.role === 'king' && piece.color === pos.turn) {
    const fileDelta = squareFile(move.to) - squareFile(move.from);
    if (Math.abs(fileDelta) === 2 && squareRank(move.to) === squareRank(move.from)) {
      const rook = pos.castles.rook[pos.turn][fileDelta > 0 ? 'h' : 'a'];
      if (rook !== undefined) return { from: move.from, to: rook };
    }
  }
  return move;
};

/** Every legal move in the position as UCI strings (promotions expanded). */
export const legalUcis = (pos: Position): string[] => {
  const ucis: string[] = [];
  for (const [from, tos] of pos.allDests()) {
    const isPawn = pos.board.get(from)?.role === 'pawn';
    for (const to of tos) {
      if (isPawn && (squareRank(to) === 0 || squareRank(to) === 7)) {
        for (const promotion of ['queen', 'rook', 'bishop', 'knight'] as const) {
          ucis.push(makeUci({ from, to, promotion }));
        }
      } else {
        ucis.push(toEngineUci(pos, { from, to }));
      }
    }
  }
  return ucis;
};

/** Normalize + validate a guess string. Throws MalformedUciError. */
export const normalizeUci = (raw: string): string => {
  const uci = raw.trim().toLowerCase();
  if (!UCI_REGEX.test(uci)) throw new MalformedUciError(raw);
  return uci;
};

/** Play a UCI move in place. Throws IllegalMoveError if not legal. */
export const playUci = (pos: Position, uci: string): void => {
  const move = moveFromEngineUci(pos, uci);
  if (!move || !pos.isLegal(move)) throw new IllegalMoveError(uci, fenOf(pos));
  pos.play(move);
};

/** UCI for a SAN move in the given position (does not mutate). */
export const uciOfSan = (pos: Position, san: string): string => {
  const move = parseSan(pos, san);
  if (!move) throw new PuzzleDataError(`SAN "${san}" is not legal in ${fenOf(pos)}`);
  return toEngineUci(pos, move);
};

/** Play a SAN move in place, returning its UCI. Throws PuzzleDataError if not legal. */
export const playSan = (pos: Position, san: string): string => {
  const move = parseSan(pos, san);
  if (!move) throw new PuzzleDataError(`SAN "${san}" is not legal in ${fenOf(pos)}`);
  const uci = makeUci(move);
  pos.play(move);
  return uci;
};

/** SAN for a UCI move in the given position (does not mutate). */
export const sanOfUci = (pos: Position, uci: string): string => {
  const move = moveFromEngineUci(pos, uci);
  if (!move || !pos.isLegal(move)) throw new IllegalMoveError(uci, fenOf(pos));
  return makeSan(pos, move);
};

/** Role of the piece standing on the from-square of a UCI move. */
export const roleAtFrom = (pos: Position, uci: string): Role => {
  const move = parseUci(uci);
  if (!move || !('from' in move)) throw new MalformedUciError(uci);
  const piece = pos.board.get(move.from);
  if (!piece) throw new IllegalMoveError(uci, fenOf(pos));
  return piece.role;
};

/** Destination square name of a UCI move, e.g. "d4". */
export const toSquareOf = (uci: string): string => {
  const move = parseUci(uci);
  if (!move || !('to' in move)) throw new MalformedUciError(uci);
  return makeSquare(move.to);
};

export { INITIAL_FEN };
