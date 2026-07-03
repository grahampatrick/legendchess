/**
 * Golden pipeline test: pinned engine + pinned inputs → byte-identical output.
 * Eval drift (engine upgrades, option changes) surfaces here as a reviewed
 * diff, never as silent puzzle changes (plan.md, CE Feedback Loops).
 *
 * Runs only when the pinned Stockfish major version is available; regenerate
 * with UPDATE_GOLDEN=1 after an intentional engine bump (and update PINNED).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CurationConfigSchema } from '../src/config';
import { buildPuzzle, puzzleToJson } from '../src/build';
import { createEngine } from '../src/engine';
import { parseGame } from '../src/pgn';

const PINNED = 'Stockfish 18';
const DEPTH = 8;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const GAME_DIR = path.join(ROOT, 'games/0001-kasparov-topalov-1999');
const GOLDEN = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'golden/kt99-moves24-25-sf18-d8.json',
);

const findStockfish = (): string | null => {
  const candidates = [
    process.env['STOCKFISH_PATH'],
    '/opt/homebrew/bin/stockfish',
    '/usr/local/bin/stockfish',
    '/usr/bin/stockfish',
    'stockfish',
  ].filter((c): c is string => !!c);
  for (const c of candidates) {
    try {
      execFileSync(c, [], { input: 'quit\n', stdio: ['pipe', 'ignore', 'ignore'], timeout: 5000 });
      return c;
    } catch {
      /* try next */
    }
  }
  return null;
};

const sfPath = findStockfish();

describe('golden build (pinned engine)', () => {
  it.skipIf(!sfPath)(
    'depth-8 single-thread build of moves 24–25 is byte-identical to the golden file',
    async () => {
      const engine = await createEngine({ path: sfPath!, depth: DEPTH, threads: 1, hashMb: 16 });
      try {
        if (!engine.name.startsWith(PINNED)) {
          console.warn(`golden test skipped: found "${engine.name}", pinned "${PINNED}"`);
          return;
        }
        const game = parseGame(readFileSync(path.join(GAME_DIR, 'game.pgn'), 'utf8'));
        const config = CurationConfigSchema.parse(
          JSON.parse(readFileSync(path.join(GAME_DIR, 'curation.json'), 'utf8')),
        );
        const mini = { ...config, window: { fromMove: 24, toMove: 25 } };
        const puzzle = await buildPuzzle({ game, config: mini, evaluate: engine.evaluate });
        const json = puzzleToJson(puzzle);

        if (process.env['UPDATE_GOLDEN']) {
          writeFileSync(GOLDEN, json);
          console.warn(`golden updated: ${GOLDEN}`);
          return;
        }
        expect(existsSync(GOLDEN), 'golden file missing — run with UPDATE_GOLDEN=1').toBe(true);
        expect(json).toBe(readFileSync(GOLDEN, 'utf8'));
      } finally {
        engine.close();
      }
    },
    120_000,
  );
});
