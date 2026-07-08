/**
 * Editorial lint: non-fatal warnings about boring or confusing decision
 * points. A curator reads these and adjusts the window; the build still
 * succeeds so experimentation stays cheap.
 */
import { RULES, type Puzzle } from '@legendchess/core';

export interface LintWarning {
  ply: number;
  kind: 'only-move' | 'near-forced' | 'hero-inferior' | 'many-equivalents';
  message: string;
}

export const lintPuzzle = (puzzle: Puzzle): LintWarning[] => {
  const warnings: LintWarning[] = [];
  for (const dp of puzzle.decisionPoints) {
    const legalCount = Object.keys(dp.evals).length;
    const heroCp = dp.evals[dp.hero.uci]!;
    const bestCp = Math.max(...Object.values(dp.evals));
    const equivalents = Object.entries(dp.evals).filter(
      ([uci, cp]) => uci !== dp.hero.uci && cp >= heroCp - RULES.cpEquivalenceThreshold,
    ).length;

    if (legalCount === 1) {
      warnings.push({
        ply: dp.ply,
        kind: 'only-move',
        message: `${dp.hero.san} is the only legal move — a free square, consider trimming the window`,
      });
    } else if (legalCount <= 3) {
      warnings.push({
        ply: dp.ply,
        kind: 'near-forced',
        message: `${dp.hero.san} has only ${legalCount - 1} alternatives — low guessing value`,
      });
    }
    if (bestCp - heroCp > 150) {
      warnings.push({
        ply: dp.ply,
        kind: 'hero-inferior',
        message: `${dp.hero.san} evaluates ${bestCp - heroCp}cp below the engine's best — players who find the better move get 🟨, which may feel unfair here`,
      });
    }
    if (equivalents >= Math.max(3, Math.floor(legalCount / 3))) {
      warnings.push({
        ply: dp.ply,
        kind: 'many-equivalents',
        message: `${dp.hero.san} has ${equivalents} engine-equivalent alternatives — 🟨 is cheap at this point`,
      });
    }
  }
  return warnings;
};
