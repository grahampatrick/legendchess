/**
 * Locate repo-level data directories (dist/puzzles, content/) in every
 * runtime: local dev (cwd = apps/web → ../../X), and Vercel serverless with
 * monorepo file tracing (files land repo-relative under the function root,
 * where cwd may be the repo root or the app dir depending on packaging).
 * Resolved once per directory and memoized; throws loudly if nothing exists —
 * a deploy without the data is broken and should say so.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

const cache = new Map<string, string>();

export const dataPath = (repoRelative: string): string => {
  const hit = cache.get(repoRelative);
  if (hit) return hit;
  const candidates = [
    path.resolve(process.cwd(), '../..', repoRelative), // dev: cwd = apps/web
    path.resolve(process.cwd(), repoRelative), // traced: cwd = repo/function root
    path.resolve(process.cwd(), '..', repoRelative), // safety: one level up
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      cache.set(repoRelative, candidate);
      return candidate;
    }
  }
  throw new Error(
    `Data directory "${repoRelative}" not found from cwd=${process.cwd()} (tried: ${candidates.join(', ')})`,
  );
};
