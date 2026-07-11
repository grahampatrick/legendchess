'use client';

/**
 * Lichess-flavored top bar: wordmark left, flat lowercase section links,
 * account on the right. Understated, dense, dark — chrome that gets out of
 * the way of the board. Rendered once in the root layout.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Daily' },
  { href: '/archive', label: 'Archive' },
  { href: '/library', label: 'Library' },
  { href: '/legends', label: 'Legends' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

export default function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main">
        <Link href="/" className="wordmark">
          <span className="knight">♞</span> LegendChess<span className="tld">.com</span>
        </Link>
        <div className="nav-links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? 'active' : undefined}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="nav-right">
          <Link href="/account" title="Account">
            Account
          </Link>
        </div>
      </nav>
    </header>
  );
}
