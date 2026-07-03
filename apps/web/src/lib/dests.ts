/**
 * Map core's legal UCI list onto chessground's dests shape, and detect when a
 * (from, to) pair is ambiguous because of promotion.
 */

export type SquareKey = string;

export const destsFromUcis = (ucis: readonly string[]): Map<SquareKey, SquareKey[]> => {
  const dests = new Map<SquareKey, SquareKey[]>();
  for (const uci of ucis) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const tos = dests.get(from) ?? [];
    if (!tos.includes(to)) tos.push(to);
    dests.set(from, tos);
  }
  return dests;
};

/** All promotion UCIs matching a from/to pair (empty when not a promotion). */
export const promotionChoices = (
  ucis: readonly string[],
  from: SquareKey,
  to: SquareKey,
): string[] => ucis.filter((u) => u.startsWith(from + to) && u.length === 5);
