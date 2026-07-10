import type { Metadata } from 'next';
import Link from 'next/link';

import { LEGENDS, monogram } from '../../data/legends';
import { listPuzzles } from '../../lib/puzzles.server';

export const metadata: Metadata = {
  title: 'The Legends — LegendChess',
  description:
    'The players you step in for: Morphy, Anderssen, Rubinstein, Marshall, Nimzowitsch, Fischer, Kasparov, Carlsen.',
};

export default async function Legends() {
  const puzzles = await listPuzzles();
  return (
    <main className="page">
      <div className="page-crumb">legends</div>
      <p className="blurb">
        The players you step in for. Portraits are period photographs in the public domain; this
        site is not affiliated with or endorsed by any player.
      </p>
      <div className="legend-grid">
        {LEGENDS.map((legend) => {
          const games = puzzles.filter((p) => p.meta.heroName === legend.heroName);
          return (
            <section className="legend-card" id={legend.slug} key={legend.slug}>
              <div className="legend-head">
                {legend.portrait ? (
                  // Plain <img>: local static asset with fixed dimensions.
                  <img
                    className="legend-portrait"
                    src={`/legends/${legend.portrait}`}
                    alt={`${legend.heroName}, ${legend.years}`}
                    width={72}
                    height={72}
                  />
                ) : (
                  <div className="legend-portrait legend-monogram" aria-hidden>
                    {monogram(legend.heroName)}
                  </div>
                )}
                <div>
                  <h2>{legend.heroName}</h2>
                  <div className="meta">
                    {legend.years} · {legend.epithet}
                  </div>
                </div>
              </div>
              <p className="legend-bio">{legend.bio}</p>
              {games.length > 0 && (
                <div className="legend-games">
                  {games.map((p) => (
                    <Link key={p.id} href={`/play/${p.id}`}>
                      {p.meta.title} ({p.meta.year})
                    </Link>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
