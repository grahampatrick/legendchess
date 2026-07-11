'use client';

/**
 * Minimal account surface: magic-link sign-in, handle claim, follows.
 * Everything here is additive — the game never requires it (non-negotiable #4).
 */
import { useEffect, useState } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';

import { browserClient, supabaseConfigured } from '../../lib/supabase';

export default function AccountPage() {
  const [client] = useState<SupabaseClient | null>(() =>
    supabaseConfigured() ? browserClient() : null,
  );
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [handle, setHandle] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    client.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = client.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (!client || !user) return;
    client
      .from('profiles')
      .select('handle')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.handle) setHandle(data.handle);
      });
  }, [client, user]);

  const signIn = async () => {
    if (!client) return;
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/account' },
    });
    setMessage(error ? error.message : 'Check your email for the sign-in link.');
  };

  const saveHandle = async () => {
    if (!client || !user) return;
    const { error } = await client.from('profiles').update({ handle }).eq('id', user.id);
    setMessage(error ? `Handle rejected: ${error.message}` : 'Handle saved.');
  };

  const header = <div className="page-crumb">Account</div>;

  if (!client) {
    return (
      <main className="page">
        {header}
        <p className="blurb" data-testid="account-unconfigured">
          Accounts aren&apos;t configured in this deployment. The daily game doesn&apos;t need them
          — <a href="/">play here</a>.
        </p>
      </main>
    );
  }

  return (
    <main className="page">
      {header}
      {!user ? (
        <div className="panel" style={{ maxWidth: 420 }}>
          <h1>Sign in</h1>
          <p className="meta">
            Only needed for the leaderboard and cross-device streaks. Anonymous play stays complete.
          </p>
          <div className="uci-row">
            <input
              className="uci"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="btn" onClick={signIn}>
              Send link
            </button>
          </div>
        </div>
      ) : (
        <div className="panel" style={{ maxWidth: 420 }}>
          <h1>Signed in</h1>
          <p className="meta">{user.email}</p>
          <label className="meta" htmlFor="handle">
            Leaderboard handle (a–z, 0–9, _, 3–20 chars)
          </label>
          <div className="uci-row">
            <input
              id="handle"
              className="uci"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
            />
            <button className="btn" onClick={saveHandle}>
              Save
            </button>
          </div>
          <button className="btn subtle" onClick={() => client.auth.signOut()}>
            Sign out
          </button>
        </div>
      )}
      {message && <p className="status-line info">{message}</p>}
    </main>
  );
}
