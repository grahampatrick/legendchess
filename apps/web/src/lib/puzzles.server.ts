/**
 * Server-side puzzle loading from the frozen artifacts in dist/puzzles/
 * (M4 will layer the daily calendar on top of this).
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { PuzzleSchema, type Puzzle } from '@legendchess/core';

const PUZZLE_ID = /^[0-9]{4}-[a-z0-9-]+$/;
const PUZZLES_DIR = path.resolve(process.cwd(), '../../dist/puzzles');

export const loadPuzzle = async (id: string): Promise<Puzzle | null> => {
  if (!PUZZLE_ID.test(id)) return null;
  try {
    const raw = await readFile(path.join(PUZZLES_DIR, `${id}.json`), 'utf8');
    return PuzzleSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const listPuzzles = async (): Promise<Puzzle[]> => {
  const files = (await readdir(PUZZLES_DIR)).filter((f) => f.endsWith('.json')).sort();
  const puzzles = await Promise.all(files.map((f) => loadPuzzle(f.replace(/\.json$/, ''))));
  return puzzles.filter((p): p is Puzzle => p !== null);
};
