import type { Metadata } from 'next';
import Link from 'next/link';

import { LEGENDS, monogram } from '../../data/legends';
import { loadCalendar } from '../../lib/calendar.server';
import { releasedPuzzleIds } from '../../lib/daily';
import { listPuzzles } from '../../lib/puzzles.server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The Legends — LegendChess',
  description:
    'The players you step in for: Morphy, Anderssen, Meitner, Rubinstein, Marshall, Nimzowitsch, Canal, Najdorf, Fischer, Kasparov, Deep Blue, Carlsen.',
};

export default async function Legends() {
  const released = releasedPuzzleIds(await loadCalendar(), new Date());
  const puzzles = (await listPuzzles()).filter((p) => released.has(p.id));
  const revealed = LEGENDS.filter((l) => puzzles.some((p) => p.meta.heroName === l.heroName));
  const hidden = LEGENDS.length - revealed.length;
  return (
    <main className="page">
      <div className="page-crumb">Legends</div>
      <p className="blurb">
        The players you step in for. Portraits are used editorially under public-domain or Creative
        Commons licenses (
        <a
          href="https://github.com/grahampatrick/legendchess/blob/main/docs/licenses.md"
          rel="noopener"
        >
          credits
        </a>
        ); this site is not affiliated with or endorsed by any player.
      </p>
      <div className="legend-grid">
        {revealed.map((legend) => {
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
        {hidden > 0 && (
          <section className="legend-card legend-locked" data-testid="locked-legends">
            <div className="legend-head">
              <div className="legend-portrait legend-monogram" aria-hidden>
                ?
              </div>
              <div>
                <h2>A new legend joins every day</h2>
                <div className="meta">8 AM Pacific, every morning — the library keeps growing.</div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
