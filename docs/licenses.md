# Third-party asset licenses

Per plan.md non-negotiable #7, every non-code asset's provenance is recorded here.

## Legend portraits (`apps/web/public/legends/`)

Policy (plan.md Foundational Decision #4): portraits only under a verified public-domain
or Creative Commons license, used editorially on the biography page with attribution
recorded here; the site-wide disclaimer (no affiliation/endorsement) applies. Legends
without a suitably licensed photo get a monogram treatment.

| File              | Subject                      | Source                                                                                                                                                                         | License basis                                                |
| ----------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `morphy.jpg`      | Paul Morphy (1837–1884)      | [Wikimedia Commons: PaulCharlesMorphy.jpg](https://commons.wikimedia.org/wiki/File:PaulCharlesMorphy.jpg)                                                                      | 19th-century photograph; public domain (author's life + 100) |
| `anderssen.jpg`   | Adolf Anderssen (1818–1879)  | [Wikimedia Commons: Anderssen, Adolf "-5" – DPLA](<https://commons.wikimedia.org/wiki/File:Anderssen,_Adolf_%22-5%22_-_DPLA_-_9ca464339f18b3d8be87fccc68c3ee73_(cropped).jpg>) | 19th-century lithograph; public domain                       |
| `anderssen-1863.jpg` | Adolf Anderssen (1818–1879) | [Wikimedia Commons: Adolf Anderssen in Breslau 1863](https://commons.wikimedia.org/wiki/File:Adolf_Anderssen_in_Breslau_1863.jpg) | 1863 photograph; public domain |
| `canal.jpg` | Esteban Canal (1896–1981) | Supplied by site owner | Late-life photograph at the board; owner states the image is publicly usable. No Commons source exists. |
| `rubinstein.jpg`  | Akiba Rubinstein (1880–1961) | [Wikimedia Commons: Akiba-RubinsteinC.jpg](https://commons.wikimedia.org/wiki/File:Akiba-RubinsteinC.jpg)                                                                      | Early-1900s photograph; public domain (pre-1930 publication) |
| `marshall.jpg`    | Frank Marshall (1877–1944)   | [Wikimedia Commons: Marshall, Frank James – DPLA](https://commons.wikimedia.org/wiki/File:Marshall,_Frank_James_-_DPLA_-_5a68b2a083f0a91b3a8d6fb699b66f59.jpg)                 | Marked "Public domain" on Commons (DPLA)                     |
| `nimzowitsch.jpg` | Aron Nimzowitsch (1886–1935) | [Wikimedia Commons: Aron Nimzowitsch.jpg](https://commons.wikimedia.org/wiki/File:Aron_Nimzowitsch.jpg)                                                                        | 1920s photograph; public domain (pre-1930 publication)       |

| `fischer.jpg` | Bobby Fischer (1943–2008) | [Wikimedia Commons: Bobby Fischer 1960 in Leipzig.jpg](https://commons.wikimedia.org/wiki/File:Bobby_Fischer_1960_in_Leipzig.jpg) | CC BY-SA 3.0 de (German Federal Archives) |
| `kasparov.jpg` | Garry Kasparov (b. 1963) | [Wikimedia Commons: Garry Kasparov European Union 2023 (cropped).jpg](<https://commons.wikimedia.org/wiki/File:Garry_Kasparov_European_Union_2023_(cropped).jpg>) | CC BY 4.0 — photo: Lukasz Kobus |
| `carlsen.jpg` | Magnus Carlsen (b. 1990) | [Wikimedia Commons: FIDE World FR Chess Championship 2019 – Magnus Carlsen (cropped).jpg](<https://commons.wikimedia.org/wiki/File:FIDE_World_FR_Chess_Championship_2019_-_Magnus_Carlsen_(cropped).jpg>) | CC BY-SA 4.0 — photo: Lennart Ootes |

Site images are duotone-filtered for the house style (a permitted adaptation under
these licenses); attribution above per license terms.

## Software

- `chessground`, `chessops`, Stockfish: GPL-3.0 (see ADR 0002).
- Piece set and board theme: chessground's bundled lichess assets (GPL).
- Favicon/apple icon (`apps/web/src/app/icon.svg`, `apple-icon.tsx`): the cburnett
  white knight from chessground's piece set on the brand green — same GPL basis.
