/**
 * The legends roster: original bios (facts are free; the words are ours),
 * epithets for the intro card, and portraits used editorially under verified
 * public-domain or Creative Commons licenses (attribution and provenance in
 * docs/licenses.md; site-wide no-affiliation disclaimer applies). Legends
 * without a suitably licensed photo fall back to a monogram.
 */

export interface Legend {
  slug: string;
  /** Must match puzzle.meta.heroName exactly — the join key. */
  heroName: string;
  years: string;
  epithet: string;
  bio: string;
  /** File under /public/legends/, or null → monogram treatment. */
  portrait: string | null;
}

export const LEGENDS: Legend[] = [
  {
    slug: 'morphy',
    heroName: 'Paul Morphy',
    years: '1837–1884',
    epithet: 'The Pride and Sorrow of Chess',
    bio: 'A New Orleans prodigy who crossed the Atlantic in 1858 and dismantled every master Europe could put in front of him — often giving odds, sometimes blindfolded, always with a clarity of development nobody had seen before. He effectively retired from serious chess at twenty-two, having run out of opponents.',
    portrait: 'morphy.jpg',
  },
  {
    slug: 'anderssen',
    heroName: 'Adolf Anderssen',
    years: '1818–1879',
    epithet: 'The Romantic',
    bio: 'A Breslau mathematics teacher who became the strongest player of the Romantic era, winning London 1851 — the first international tournament in history. His two most famous casual games, the Immortal and the Evergreen, are still the textbook definition of sacrificial attack.',
    portrait: 'anderssen.jpg',
  },
  {
    slug: 'rubinstein',
    heroName: 'Akiba Rubinstein',
    years: '1880–1961',
    epithet: 'The Endgame Artist',
    bio: 'A Polish master whose rook endgames are still taught as scripture, and whose 1912 — four major tournament wins in a single year — may be the best year anyone had before the modern era. The world-title match he earned never happened, and chess history has felt guilty about it ever since.',
    portrait: 'rubinstein.jpg',
  },
  {
    slug: 'marshall',
    heroName: 'Frank Marshall',
    years: '1877–1944',
    epithet: 'The Swashbuckler',
    bio: 'United States Champion for twenty-seven years, founder of the Marshall Chess Club, and the most dangerous attacking player of his generation. He was said to save his prepared surprises for years — and the gambit that bears his name is still feared in the Ruy Lopez a century later.',
    portrait: 'marshall.jpg',
  },
  {
    slug: 'nimzowitsch',
    heroName: 'Aron Nimzowitsch',
    years: '1886–1935',
    epithet: 'The Hypermodern Prophet',
    bio: 'The Latvian-born author of My System, the most influential chess book ever written. He taught the world to blockade, to overprotect, to restrain before attacking — and in the Immortal Zugzwang Game he won by leaving his opponent, with the whole army on the board, no move that didn’t lose.',
    portrait: 'nimzowitsch.jpg',
  },
  {
    slug: 'fischer',
    heroName: 'Bobby Fischer',
    years: '1943–2008',
    epithet: 'The Prodigy of Brooklyn',
    bio: 'At thirteen he played the Game of the Century; at twenty-nine he broke a quarter-century of Soviet dominance to become World Champion in Reykjavik, 1972 — along the way winning twenty consecutive games against the strongest players alive. His precision made brilliance look inevitable.',
    portrait: 'fischer.jpg',
  },
  {
    slug: 'kasparov',
    heroName: 'Garry Kasparov',
    years: 'b. 1963',
    epithet: 'The Beast of Baku',
    bio: 'The youngest World Champion in history at twenty-two, world number one for nearly two decades, and the most feared attacking calculator the game has produced. His 1999 win over Topalov at Wijk aan Zee is routinely called the greatest game ever played — and in that same year he beat the combined vote of fifty thousand players as "the World."',
    portrait: 'kasparov.jpg',
  },
  {
    slug: 'carlsen',
    heroName: 'Magnus Carlsen',
    years: 'b. 1990',
    epithet: 'The Grinder from Norway',
    bio: 'Five-time World Champion, holder of the highest rating ever recorded (2882), and author of a 125-game unbeaten streak in classical chess. His signature weapon is not the sacrifice but the squeeze: equal positions ground into wins over six hours — including the longest world championship game ever played.',
    portrait: 'carlsen.jpg',
  },
];

export const legendByHeroName = (heroName: string): Legend | undefined =>
  LEGENDS.find((l) => l.heroName === heroName);

export const monogram = (heroName: string): string =>
  heroName
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
