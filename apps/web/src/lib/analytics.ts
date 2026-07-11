/**
 * Privacy-respecting analytics (Plausible), env-gated and fully optional —
 * exactly five product events, no user identifiers: game_start,
 * game_complete (outcome/score/day + retention buckets), share_click,
 * share_story, hint_used. With no NEXT_PUBLIC_PLAUSIBLE_DOMAIN set, no-op.
 */

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string | number> }) => void;
  }
}

export const track = (event: string, props?: Record<string, string | number>): void => {
  if (typeof window === 'undefined') return;
  window.plausible?.(event, props ? { props } : undefined);
};

/**
 * Retention proxies without identifiers: the client knows its own history
 * (localStorage), so game_complete carries coarse buckets instead of any
 * user id. "Share of completions with streak ≥ 2" ≈ D1 retention;
 * "games = 1" is the new-player mix. Coarse on purpose — buckets, not
 * counters, so events stay unlinkable.
 */
export const streakBucket = (streak: number): string =>
  streak <= 1 ? '1' : streak <= 6 ? '2-6' : '7+';

export const gamesBucket = (gamesPlayed: number): string =>
  gamesPlayed <= 1 ? '1' : gamesPlayed <= 9 ? '2-9' : '10+';
