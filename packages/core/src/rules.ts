/**
 * Every tunable constant of the v1 ruleset in one place (ADR 0004).
 * Client, tests, and server verification all grade through these values.
 */
export interface Rules {
  /** Lives for the whole game. A miss costs one; at zero the player becomes a spectator. */
  readonly lives: number;
  /**
   * A non-hero move is "equivalent" (🟨) when its eval is within this many
   * centipawns of the hero move's eval, from the hero's perspective.
   * Moves *better* than the hero's are always equivalent.
   */
  readonly cpEquivalenceThreshold: number;
  /**
   * Each decision point resolves at a level: 3 🟩, 2 🟨, 1 🟥, 0 ⬛.
   * A point starts at 3; every miss or revealed hint downgrades it one step
   * (floor 1 while still guessing). Equivalent guesses cap at 2.
   */
  readonly pointsByLevel: Readonly<Record<0 | 1 | 2 | 3, number>>;
}

export const RULES: Rules = {
  lives: 3,
  cpEquivalenceThreshold: 30,
  pointsByLevel: { 0: 0, 1: 25, 2: 60, 3: 100 },
};
