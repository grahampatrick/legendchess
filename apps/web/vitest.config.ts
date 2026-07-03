import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['tests/**'], // Playwright specs run via `pnpm e2e`
  },
});
