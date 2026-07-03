/**
 * Builds the Kasparov–Topalov game from games/0001 with a fake evaluator and
 * cross-checks every structural field against the canonical M1 fixture —
 * forge must reproduce by pipeline what M1 authored by hand.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { legalUcis, positionFromFen, type Puzzle } from '@playthelegend/core';

import { CurationConfigSchema } from '../src/config';
import { buildPuzzle, heroPly } from '../src/build';
import { CurationError } from '../src/errors';
import { gatePuzzle } from '../src/gate';
import { parseGame } from '../src/pgn';
import type { MoveEvaluator } from '../src/engine';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const GAME_DIR = path.join(ROOT, 'games/0001-kasparov-topalov-1999');
const FIXTURE = path.join(ROOT, 'fixtures/puzzles/0001-kasparov-topalov-1999.json');

/** Deterministic fake: every legal move gets a value derived from its UCI. */
const fakeEvaluator: MoveEvaluator = (fen) =>
  Promise.resolve(
    Object.fromEntries(
      legalUcis(positionFromFen(fen))
        .sort()
        .map((uci) => [uci, (uci.charCodeAt(0) * 7 + uci.charCodeAt(3) * 3) % 100]),
    ),
  );

const loadInputs = () => ({
  game: parseGame(readFileSync(path.join(GAME_DIR, 'game.pgn'), 'utf8')),
  config: CurationConfigSchema.parse(
    JSON.parse(readFileSync(path.join(GAME_DIR, 'curation.json'), 'utf8')),
  ),
});

describe('heroPly', () => {
  it('maps full-move numbers to plies per color', () => {
    expect(heroPly(1, 'white')).toBe(1);
    expect(heroPly(1, 'black')).toBe(2);
    expect(heroPly(24, 'white')).toBe(47);
    expect(heroPly(24, 'black')).toBe(48);
  });
});

describe('buildPuzzle on games/0001', () => {
  it('reproduces the canonical fixture structurally (all but evals/meta)', async () => {
    const { game, config } = loadInputs();
    const built = await buildPuzzle({ game, config, evaluate: fakeEvaluator });
    const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Puzzle;

    expect(built.prelude).toEqual(fixture.prelude);
    expect(built.startFen).toBe(fixture.startFen);
    expect(built.finale).toEqual(fixture.finale);
    expect(built.decisionPoints.map((d) => ({ ply: d.ply, hero: d.hero, reply: d.reply }))).toEqual(
      fixture.decisionPoints.map((d) => ({ ply: d.ply, hero: d.hero, reply: d.reply })),
    );
    expect(built.decisionPoints.map((d) => Object.keys(d.evals).sort())).toEqual(
      fixture.decisionPoints.map((d) => Object.keys(d.evals).sort()),
    );
    expect(built.meta.year).toBe(1999);
    expect(built.meta.opponentName).toBe('Veselin Topalov');
    expect(built.meta.result).toBe('1-0');
  });

  it('produces a puzzle that passes the shipping gate', async () => {
    const { game, config } = loadInputs();
    const built = await buildPuzzle({ game, config, evaluate: fakeEvaluator });
    expect(() => gatePuzzle(built)).not.toThrow();
  });

  it('rejects a hero who is not the configured color', async () => {
    const { game, config } = loadInputs();
    const wrong = { ...config, heroName: 'Veselin Topalov' };
    await expect(buildPuzzle({ game, config: wrong, evaluate: fakeEvaluator })).rejects.toThrow(
      CurationError,
    );
  });

  it('rejects a window that runs past the end of the game', async () => {
    const { game, config } = loadInputs();
    const wrong = { ...config, window: { fromMove: 40, toMove: 60 } };
    await expect(buildPuzzle({ game, config: wrong, evaluate: fakeEvaluator })).rejects.toThrow(
      /only \d+ plies/,
    );
  });

  it('rejects an evaluator with incomplete coverage', async () => {
    const { game, config } = loadInputs();
    const partial: MoveEvaluator = async (fen) => {
      const full = await fakeEvaluator(fen);
      const entries = Object.entries(full);
      return Object.fromEntries(entries.slice(0, entries.length - 1));
    };
    await expect(buildPuzzle({ game, config, evaluate: partial })).rejects.toThrow(/missing/);
  });
});

describe('parseGame', () => {
  it('rejects empty input and multi-game files', () => {
    expect(() => parseGame('')).toThrow(/[Nn]o game|no moves/);
    const pgn = readFileSync(path.join(GAME_DIR, 'game.pgn'), 'utf8');
    expect(() => parseGame(pgn + '\n\n' + pgn)).toThrow(/exactly one game/);
  });

  it('strips move numbers and yields mainline SAN', () => {
    const { san } = parseGame('[Result "1-0"]\n\n1. e4 e5 2. Nf3 (2. f4 exf4) 2... Nc6 1-0');
    expect(san).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
  });
});
