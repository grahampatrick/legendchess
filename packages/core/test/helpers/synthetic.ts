/**
 * A tiny synthetic puzzle built at test time with fully controlled eval
 * tables, so grading-boundary tests don't depend on a real engine's opinion.
 * Fixture 0001 (real Stockfish numbers) covers integration.
 */
import {
  INITIAL_FEN,
  fenOf,
  initialPosition,
  legalUcis,
  playSan,
  sanOfUci,
  type Puzzle,
} from '../../src/index.js';

interface SyntheticPoint {
  heroSan: string;
  replySan: string | null;
  /** Eval overrides by UCI; every other legal move defaults to -200, hero to +50. */
  evals?: Record<string, number>;
  heroCp?: number;
}

export const HERO_CP_DEFAULT = 50;
export const NON_HERO_CP_DEFAULT = -200;

export const buildSyntheticPuzzle = (
  points: SyntheticPoint[],
  finaleSan: string[] = [],
): Puzzle => {
  const pos = initialPosition();
  const decisionPoints: Puzzle['decisionPoints'] = [];
  let ply = 1;

  for (const point of points) {
    const legal = legalUcis(pos);
    const heroUciFromSan = (() => {
      // Resolve the hero SAN to UCI against the current position.
      const probe = pos.clone();
      return playSan(probe, point.heroSan);
    })();
    const evals = Object.fromEntries(
      legal.map((uci) => [
        uci,
        point.evals?.[uci] ??
          (uci === heroUciFromSan ? (point.heroCp ?? HERO_CP_DEFAULT) : NON_HERO_CP_DEFAULT),
      ]),
    );
    const heroSan = sanOfUci(pos, heroUciFromSan);
    playSan(pos, point.heroSan);
    const hero = { uci: heroUciFromSan, san: heroSan };

    let reply: Puzzle['decisionPoints'][number]['reply'] = null;
    if (point.replySan) {
      const probe = pos.clone();
      const replyUci = playSan(probe, point.replySan);
      reply = { uci: replyUci, san: sanOfUci(pos, replyUci) };
      playSan(pos, point.replySan);
    }

    decisionPoints.push({ ply, hero, evals, reply });
    ply += point.replySan ? 2 : 1;
  }

  const finale: string[] = [];
  for (const san of finaleSan) {
    const probe = pos.clone();
    const uci = playSan(probe, san);
    finale.push(sanOfUci(pos, uci));
    playSan(pos, san);
  }
  void fenOf(pos);

  return {
    schemaVersion: 1,
    id: '0000-synthetic-test',
    meta: {
      title: 'Synthetic Test Game',
      event: 'Test Suite',
      year: 2000,
      heroName: 'Test Hero',
      heroColor: 'white',
      opponentName: 'Test Opponent',
      result: '1-0',
      blurb: 'A synthetic game for unit tests.',
      sources: ['synthetic'],
    },
    prelude: { san: [] },
    startFen: INITIAL_FEN,
    decisionPoints,
    finale: { san: finale },
  };
};

/**
 * Standard 3-point synthetic game: 1.e4 e5 2.Nf3 Nc6 3.Bb5, finale 3...a6 4.Ba4.
 *
 * Point 1 (hero e2e4, cp 50):
 *   d2d4 → 30  (Δ20, inside threshold → equivalent)
 *   g1f3 → 20  (Δ30, exactly at threshold → equivalent)
 *   b1c3 → 19  (Δ31, one past threshold → miss)
 * Point 2 (hero g1f3, cp 40):
 *   f1c4 → 45  (better than the hero's move → equivalent)
 * Point 3 (hero f1b5, no reply; finale continues with Black's 3...a6).
 */
export const standardSynthetic = (): Puzzle =>
  buildSyntheticPuzzle(
    [
      {
        heroSan: 'e4',
        replySan: 'e5',
        evals: { d2d4: 30, g1f3: 20, b1c3: 19 },
      },
      { heroSan: 'Nf3', replySan: 'Nc6', heroCp: 40, evals: { f1c4: 45 } },
      { heroSan: 'Bb5', replySan: null },
    ],
    ['a6', 'Ba4'],
  );
