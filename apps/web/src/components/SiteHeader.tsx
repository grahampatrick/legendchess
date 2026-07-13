'use client';

/**
 * Lichess-flavored top bar: wordmark left, flat lowercase section links,
 * account on the right. Understated, dense, dark — chrome that gets out of
 * the way of the board. Rendered once in the root layout.
 *
 * On narrow screens the bar wraps to two rows (wordmark + account, then the
 * section links full-width) — nothing scrolls sideways.
 */
import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Logo } from './Logo';
import { browserClient, supabaseConfigured } from '../lib/supabase';

const LINKS = [
  { href: '/', label: 'Daily' },
  { href: '/legends', label: 'Legends' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/library', label: 'Library' },
];

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.2" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  // "Sign up" until a session proves otherwise — most visitors are signed out.
  const client = useMemo(() => (supabaseConfigured() ? browserClient() : null), []);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = client.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, [client]);
  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main">
        <Link href="/" className="wordmark">
          <Logo size={30} />
          <span>LegendChess</span>
        </Link>
        <div className="nav-links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? 'active' : undefined}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="nav-right">
          <a
            href="https://www.instagram.com/playlegendchess/"
            rel="noopener"
            target="_blank"
            className="nav-icon"
            title="@playlegendchess on Instagram"
            aria-label="LegendChess on Instagram"
          >
            <InstagramIcon />
          </a>
          <Link href="/account" title={signedIn ? 'Account' : 'Sign up'}>
            {signedIn ? 'Account' : 'Sign up'}
          </Link>
        </div>
      </nav>
    </header>
  );
}
