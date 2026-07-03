/**
 * Privacy-respecting analytics (Plausible), env-gated and fully optional —
 * exactly four product events, no user identifiers:
 *   game_start, game_complete (outcome/score/day), share_click, hint_used.
 * With no NEXT_PUBLIC_PLAUSIBLE_DOMAIN set, this is a no-op.
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
