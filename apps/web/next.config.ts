import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages ship TS source (see package exports); Next transpiles them.
  transpilePackages: ['@legendchess/core'],
};

export default nextConfig;
