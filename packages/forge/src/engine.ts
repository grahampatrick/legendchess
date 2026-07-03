/**
 * Deterministic UCI Stockfish wrapper. Evaluates EVERY legal move of a
 * position via MultiPV at a fixed depth with Threads=1 by default —
 * reproducible for golden tests (same engine version + options → same table).
 *
 * Hard lesson from M1 (see plan.md): Stockfish silently ignores out-of-range
 * setoption values. We therefore read the engine's declared option bounds
 * from the `uci` handshake and clamp ourselves — and callers must still check
 * eval coverage against the legal move list.
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

import { MATE_CP } from '@playthelegend/core';

import { EngineError } from './errors';

export interface EngineOptions {
  /** Path to a stockfish binary. */
  path: string;
  /** Fixed search depth (determinism requires fixed depth, not time). */
  depth: number;
  /** Search threads. >1 is faster but NOT deterministic; goldens use 1. */
  threads?: number;
  hashMb?: number;
}

/** Evaluate a position: centipawns per legal move (UCI), side-to-move POV. */
export type MoveEvaluator = (fen: string) => Promise<Record<string, number>>;

export interface Engine {
  readonly name: string;
  evaluate: MoveEvaluator;
  close(): void;
}

const INFO_RE =
  /^info depth (\d+) .*?multipv \d+ score (cp|mate) (-?\d+) (?!.*\b(?:lower|upper)bound\b).*?pv ([a-h][1-8][a-h][1-8][qrbn]?)/;

export const createEngine = async (options: EngineOptions): Promise<Engine> => {
  const { path, depth, threads = 1, hashMb = 256 } = options;
  let proc: ChildProcessWithoutNullStreams;
  try {
    proc = spawn(path);
  } catch (e) {
    throw new EngineError(`Failed to spawn engine at "${path}": ${String(e)}`);
  }

  const lines: string[] = [];
  let wake: (() => void) | null = null;
  let died: string | null = null;
  proc.stdout.on('data', (chunk: Buffer) => {
    for (const line of chunk.toString().split('\n')) {
      const trimmed = line.trim();
      if (trimmed) lines.push(trimmed);
    }
    wake?.();
  });
  proc.on('error', (e) => {
    died = String(e);
    wake?.();
  });
  proc.on('exit', (code) => {
    died ??= `engine exited with code ${code}`;
    wake?.();
  });

  const nextLine = (): Promise<string> =>
    new Promise((resolve, reject) => {
      const check = () => {
        const line = lines.shift();
        if (line !== undefined) resolve(line);
        else if (died) reject(new EngineError(died));
        else wake = check;
      };
      check();
    });

  const send = (cmd: string): void => {
    proc.stdin.write(cmd + '\n');
  };

  const drainUntil = async (predicate: (line: string) => boolean): Promise<string[]> => {
    const seen: string[] = [];
    for (;;) {
      const line = await nextLine();
      seen.push(line);
      if (predicate(line)) return seen;
    }
  };

  // Handshake: capture the engine name and its declared option bounds.
  send('uci');
  const handshake = await drainUntil((l) => l === 'uciok');
  const name =
    handshake.find((l) => l.startsWith('id name'))?.slice('id name '.length) ?? 'unknown';
  const multiPvMax = Number(
    handshake.find((l) => l.startsWith('option name MultiPV'))?.match(/max (\d+)/)?.[1] ?? NaN,
  );
  if (!Number.isFinite(multiPvMax)) {
    throw new EngineError(`Engine "${name}" does not declare a MultiPV option`);
  }

  send(`setoption name Threads value ${threads}`);
  send(`setoption name Hash value ${hashMb}`);
  send(`setoption name MultiPV value ${multiPvMax}`);
  send('isready');
  await drainUntil((l) => l === 'readyok');

  const evaluate: MoveEvaluator = async (fen) => {
    if (died) throw new EngineError(died);
    // ucinewgame clears the hash so evals don't depend on evaluation order.
    send('ucinewgame');
    send('isready');
    await drainUntil((l) => l === 'readyok');
    send(`position fen ${fen}`);
    send(`go depth ${depth}`);

    const best = new Map<string, { depth: number; cp: number }>();
    for (;;) {
      const line = await nextLine();
      if (line.startsWith('bestmove')) break;
      const m = line.match(INFO_RE);
      if (!m) continue;
      const [, d, kind, val, uci] = m;
      const cp =
        kind === 'cp'
          ? Number(val)
          : Number(val) > 0
            ? MATE_CP - Number(val)
            : -MATE_CP - Number(val);
      const prev = best.get(uci!);
      if (!prev || Number(d) >= prev.depth) best.set(uci!, { depth: Number(d), cp });
    }
    if (best.size === 0) {
      throw new EngineError(`Engine produced no evaluations for "${fen}" (MultiPV inactive?)`);
    }
    return Object.fromEntries(
      [...best.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([uci, e]) => [uci, e.cp]),
    );
  };

  return {
    name,
    evaluate,
    close: () => {
      send('quit');
      proc.stdin.end();
    },
  };
};
