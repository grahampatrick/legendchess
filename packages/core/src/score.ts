import { RULES, type Rules } from './rules';
import type { Puzzle } from './schema';
import type { Level, PointRecord, SessionState } from './session';

const EMOJI_BY_LEVEL: Record<Level, string> = { 3: '🟩', 2: '🟨', 1: '🟥', 0: '⬛' };

export const pointEmoji = (record: PointRecord): string =>
  record.resolved ? EMOJI_BY_LEVEL[record.resolved.level] : EMOJI_BY_LEVEL[0];

/** One emoji per decision point, in order. */
export const emojiGrid = (records: readonly PointRecord[]): string =>
  records.map(pointEmoji).join('');

export const scoreSession = (records: readonly PointRecord[], rules: Rules = RULES): number =>
  records.reduce((sum, r) => sum + (r.resolved ? rules.pointsByLevel[r.resolved.level] : 0), 0);

export const maxScore = (puzzle: Puzzle, rules: Rules = RULES): number =>
  puzzle.decisionPoints.length * rules.pointsByLevel[3];

export interface ShareTextInput {
  puzzle: Puzzle;
  state: SessionState;
  /** Daily puzzle number, e.g. 37 for "#37". Omitted for archive/free play. */
  dayNumber?: number;
  rules?: Rules;
}

/**
 * Lives as hearts, one convention everywhere: filled = remaining, hollow =
 * spent (♡♡♡ on a loss — spent, not dead; the tone stays warm).
 */
export const heartsOf = (livesLeft: number, rules: Rules = RULES): string =>
  '❤'.repeat(Math.max(0, livesLeft)) + '♡'.repeat(Math.max(0, rules.lives - livesLeft));

/**
 * The shareable result block. This format is a public API (snapshot-tested;
 * changes need an ADR — see 0007). The ♞ prefix is the grid's signature: it
 * makes a pasted result recognizably OURS in any feed or group chat.
 */
export const formatShareText = ({
  puzzle,
  state,
  dayNumber,
  rules = RULES,
}: ShareTextInput): string => {
  const day = dayNumber === undefined ? '' : ` #${dayNumber}`;
  const hearts = heartsOf(state.livesLeft, rules);
  const score = scoreSession(state.records, rules);
  return [
    `LegendChess${day} — ${puzzle.meta.heroName}, ${puzzle.meta.event} ${puzzle.meta.year}`,
    `♞${emojiGrid(state.records)}`,
    `${hearts} ${score}/${maxScore(puzzle, rules)}`,
  ].join('\n');
};
