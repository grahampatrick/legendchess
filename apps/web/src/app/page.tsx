import Link from 'next/link';

import { listPuzzles } from '../lib/puzzles.server';

export default async function Home() {
  const puzzles = await listPuzzles();
  return (
    <main className="page">
      <div className="site-title">
        <span className="knight">♞</span> Play the Legend
      </div>
      <p className="blurb">
        Step into the shoes of a legend and find the moves they actually played. One game a day is
        coming — for now, the training library:
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
