import Link from 'next/link';

import { listPuzzles } from '../../lib/puzzles.server';

export default async function Library() {
  const puzzles = await listPuzzles();
  return (
    <main className="page">
      <div className="page-crumb">Training library</div>
      <p className="blurb">
        Free play — no streaks, no spoiler warnings. <Link href="/">Today&apos;s daily</Link> is the
        real thing.
      </p>
      <ul className="puzzle-list">
        {puzzles.map((p) => (
          <li key={p.id}>
            <Link href={`/play/${p.id}`}>{p.meta.title}</Link>
            <div className="meta">
              {p.meta.heroName} vs {p.meta.opponentName} · {p.meta.event} · {p.meta.year} ·{' '}
              {p.decisionPoints.length} moves to find
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
