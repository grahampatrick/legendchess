/**
 * forge CLI — the I/O boundary. All logic lives in build/gate/lint.
 *
 *   forge build <game-dir...> [--out dist/puzzles] [--stockfish PATH] [--depth N] [--threads N]
 *   forge validate <file-or-dir...>
 *
 * A game dir contains `game.pgn` (bare movetext) and `curation.json`.
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { CurationConfigSchema } from './config';
import { buildPuzzle, puzzleToJson } from './build';
import { createEngine } from './engine';
import { gatePuzzle } from './gate';
import { parseGame } from './pgn';

interface Flags {
  out: string;
  stockfish: string;
  depth: number;
  threads: number;
}

/** pnpm runs scripts with the package as cwd; resolve user paths from where they invoked. */
const INVOKE_CWD = process.env['INIT_CWD'] ?? process.cwd();
const fromInvokeCwd = (p: string): string => path.resolve(INVOKE_CWD, p);

const parseArgs = (argv: string[]): { command: string; targets: string[]; flags: Flags } => {
  const [command = '', ...rest] = argv.filter((a) => a !== '--');
  const targets: string[] = [];
  const flags: Flags = {
    out: 'dist/puzzles',
    stockfish: process.env['STOCKFISH_PATH'] ?? 'stockfish',
    depth: 16,
    threads: Math.max(
      1,
      (process.env['FORGE_THREADS'] ? Number(process.env['FORGE_THREADS']) : 4) | 0,
    ),
  };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg === '--out') flags.out = rest[++i]!;
    else if (arg === '--stockfish') flags.stockfish = rest[++i]!;
    else if (arg === '--depth') flags.depth = Number(rest[++i]);
    else if (arg === '--threads') flags.threads = Number(rest[++i]);
    else targets.push(arg);
  }
  return { command, targets, flags };
};

const printWarnings = (id: string, warnings: { ply: number; message: string }[]): void => {
  for (const w of warnings) console.warn(`  ⚠ ${id} ply ${w.ply}: ${w.message}`);
};

const build = async (targets: string[], flags: Flags): Promise<void> => {
  if (targets.length === 0) throw new Error('build: no game directories given');
  const engine = await createEngine({
    path: flags.stockfish,
    depth: flags.depth,
    threads: flags.threads,
  });
  console.log(`engine: ${engine.name} · depth ${flags.depth} · threads ${flags.threads}`);
  try {
    const outDir = fromInvokeCwd(flags.out);
    mkdirSync(outDir, { recursive: true });
    for (const target of targets) {
      const dir = fromInvokeCwd(target);
      const config = CurationConfigSchema.parse(
        JSON.parse(readFileSync(path.join(dir, 'curation.json'), 'utf8')),
      );
      const game = parseGame(readFileSync(path.join(dir, 'game.pgn'), 'utf8'));
      const started = performance.now();
      const puzzle = await buildPuzzle({ game, config, evaluate: engine.evaluate });
      const { warnings } = gatePuzzle(puzzle); // belt and braces before writing
      const outPath = path.join(outDir, `${puzzle.id}.json`);
      writeFileSync(outPath, puzzleToJson(puzzle));
      const secs = ((performance.now() - started) / 1000).toFixed(1);
      console.log(`✓ ${puzzle.id} — ${puzzle.decisionPoints.length} points, ${secs}s → ${outPath}`);
      printWarnings(puzzle.id, warnings);
    }
  } finally {
    engine.close();
  }
};

const validate = (targets: string[]): void => {
  if (targets.length === 0) throw new Error('validate: no files or directories given');
  const files = targets.map(fromInvokeCwd).flatMap((t) =>
    statSync(t).isDirectory()
      ? readdirSync(t)
          .filter((f) => f.endsWith('.json'))
          .map((f) => path.join(t, f))
      : [t],
  );
  if (files.length === 0) throw new Error('validate: no .json puzzle files found');
  let failed = 0;
  for (const file of files) {
    try {
      const { puzzle, warnings } = gatePuzzle(JSON.parse(readFileSync(file, 'utf8')));
      console.log(`✓ ${puzzle.id} (${path.basename(file)})`);
      printWarnings(puzzle.id, warnings);
    } catch (e) {
      failed += 1;
      console.error(`✗ ${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log(`${files.length - failed}/${files.length} puzzles pass`);
  if (failed > 0) process.exit(1);
};

const main = async (): Promise<void> => {
  const { command, targets, flags } = parseArgs(process.argv.slice(2));
  if (command === 'build') await build(targets, flags);
  else if (command === 'validate') validate(targets);
  else {
    console.error('usage: forge build <game-dir...> | forge validate <file-or-dir...>');
    process.exit(2);
  }
};

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
