export const PACKAGE_NAME = '@playthelegend/core';

export {
  MalformedUciError,
  IllegalMoveError,
  SessionCompleteError,
  NoMoreHintsError,
  PuzzleDataError,
  PlayTheLegendError,
} from './errors.js';
export { RULES, type Rules } from './rules.js';
export {
  PuzzleSchema,
  MATE_CP,
  UCI_REGEX,
  type Puzzle,
  type DecisionPoint,
  type PuzzleMove,
} from './schema.js';
export {
  initialPosition,
  positionFromFen,
  fenOf,
  turnOf,
  legalUcis,
  playSan,
  playUci,
  sanOfUci,
  INITIAL_FEN,
  type Position,
} from './chess.js';
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
} from './session.js';
export {
  emojiGrid,
  pointEmoji,
  scoreSession,
  maxScore,
  formatShareText,
  type ShareTextInput,
} from './score.js';
export { validatePuzzle } from './validate.js';
