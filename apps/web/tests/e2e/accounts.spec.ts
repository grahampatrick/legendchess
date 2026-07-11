/**
 * Accounts/leaderboard degradation (ADR 0006): without Supabase env vars the
 * surfaces explain themselves and the game is untouched. (The verified submit
 * path itself is unit-tested with auth fakes in test/submission.test.ts; RLS
 * is pgTAP-tested via `supabase test db`.)
 */
import { expect, test } from '@playwright/test';

test('leaderboard page degrades gracefully when unconfigured', async ({ page }) => {
  await page.goto('/leaderboard');
  await expect(page.locator('body')).toContainText(
    /leaderboard isn't configured|Final standings|day #1 ends/,
  );
});

test('account page degrades gracefully when unconfigured', async ({ page }) => {
  await page.goto('/account');
  await expect(page.locator('body')).toContainText(/Accounts aren't configured|Sign in/);
});

test('the submit API refuses politely when unconfigured or signed out', async ({ request }) => {
  const res = await request.post('/api/submit', {
    data: { dateKey: '2026-07-03', actions: [{ type: 'guess', uci: 'd1d4' }] },
  });
  expect([401, 503]).toContain(res.status());
  const body = (await res.json()) as { ok: boolean };
  expect(body.ok).toBe(false);
});
