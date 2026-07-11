import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-cols">
        <div>
          <h3>Play</h3>
          <Link href="/">Today&apos;s daily</Link>
          <Link href="/archive">Archive</Link>
          <Link href="/library">Training library</Link>
          <Link href="/leaderboard">Leaderboard</Link>
        </div>
        <div>
          <h3>The game</h3>
          <Link href="/legends">The legends</Link>
          <a href="https://github.com/grahampatrick/legendchess" rel="noopener">
            Source code
          </a>
          <a
            href="https://github.com/grahampatrick/legendchess/blob/main/CONTRIBUTING.md"
            rel="noopener"
          >
            Add a famous game
          </a>
        </div>
        <div>
          <h3>Fine print</h3>
          <a href="https://github.com/grahampatrick/legendchess/blob/main/LICENSE" rel="noopener">
            GPL-3.0 — free and open source
          </a>
          <span className="footer-note">
            Not affiliated with or endorsed by any player, federation, or chess app. Historical game
            scores are public-domain facts; the words are ours.
          </span>
        </div>
      </div>
    </footer>
  );
}
