/**
 * Supabase wiring, deliberately optional: without env configuration the whole
 * accounts/leaderboard layer disappears and anonymous play is untouched
 * (non-negotiable #4). Browser client for auth UI; server helpers for the
 * verified submit route and leaderboard queries.
 */
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

export const supabaseConfigured = (): boolean => !!url && !!anonKey;

/** Client-side (auth UI). Null when not configured. */
export const browserClient = (): SupabaseClient | null =>
  supabaseConfigured() ? createBrowserClient(url!, anonKey!) : null;

/** Server-side, cookie-bound (who is the caller?). */
export const serverClientFromCookies = async (): Promise<SupabaseClient | null> => {
  if (!supabaseConfigured()) return null;
  const { cookies } = await import('next/headers');
  const store = await cookies();
  return createServerClient(url!, anonKey!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: () => {
        /* read-only usage in RSC/route context */
      },
    },
  });
};

/** Service-role client — bypasses RLS; used ONLY by the verified submit path. */
export const serviceClient = (): SupabaseClient | null => {
  const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
};
