import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages ship TS source (see package exports); Next transpiles them.
  transpilePackages: ['@legendchess/core'],
  // Monorepo: trace from the repo root so the frozen puzzle artifacts and the
  // calendar (which live outside apps/web) ship inside the serverless bundle.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  outputFileTracingIncludes: {
    '/**': ['../../dist/puzzles/**', '../../content/**'],
  },
};

export default nextConfig;
