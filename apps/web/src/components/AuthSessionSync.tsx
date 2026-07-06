'use client';

/**
 * Mounted once in the root layout. Creating the browser client makes its
 * detectSessionInUrl bootstrap run on WHATEVER page an auth redirect lands on
 * — so a magic link that falls back to the Site URL (e.g. an allowlist
 * mismatch downgrading /account to /) still completes sign-in instead of
 * leaving an unconsumed ?code= in the URL. No UI; no-op when unconfigured.
 */
import { useEffect } from 'react';

import { browserClient } from '../lib/supabase';

export default function AuthSessionSync() {
  useEffect(() => {
    void browserClient();
  }, []);
  return null;
}
