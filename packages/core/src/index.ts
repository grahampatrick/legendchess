export const PACKAGE_NAME = '@legendchess/core';

export {
  MalformedUciError,
  IllegalMoveError,
  SessionCompleteError,
  NoMoreHintsError,
  PuzzleDataError,
  LegendChessError,
} from './errors';
export { RULES, type Rules } from './rules';
export {
  PuzzleSchema,
  MATE_CP,
  UCI_REGEX,
  type Puzzle,
  type DecisionPoint,
  type PuzzleMove,
} from './schema';
export {
  initialPosition,
  positionFromFen,
  fenOf,
  turnOf,
  legalUcis,
  playSan,
  playUci,
  sanOfUci,
  uciOfSan,
  fenIsCheck,
  INITIAL_FEN,
  type Position,
} from './chess';
export {
  createSession,
  type Session,
  type SessionState,
  type GuessOutcome,
  type GuessResult,
  type Hint,
  type Level,
  type Phase,
  type PointRecord,
} from './session';
export {
  emojiGrid,
  pointEmoji,
  scoreSession,
  maxScore,
  formatShareText,
  type ShareTextInput,
} from './score';
export { validatePuzzle } from './validate';
