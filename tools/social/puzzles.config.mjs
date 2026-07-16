/**
 * Hand-tuned social copy per puzzle. Anything omitted falls back to a safe
 * generic in generate.mjs. `hook` is the cliffhanger caption at the frozen
 * moment; `intro` is the board-screen opener; `subtitle` the title-card body.
 * `hideHeroMoves` — how many final hero moves to keep secret (default 2;
 * 'all' recreates the day-1 Kasparov treatment).
 */
export const CONFIG = {
  '0001-kasparov-topalov-1999': {
    hideHeroMoves: 'all',
    subtitle:
      'Wijk aan Zee, 1999.<br>Garry Kasparov vs Veselin Topalov —<br>the game the chess world calls<br>the greatest ever played.',
    intro: 'Kasparov is White. Watch the position sharpen.',
    hook: 'Here, Kasparov played the most famous move in chess history.',
  },
  '0002-morphy-opera-1858': {
    subtitle:
      "Paris, 1858. An opera box during <i>Norma</i>.<br>Paul Morphy vs the Duke of Brunswick<br>&amp; Count Isouard — who keep him<br>facing away from the stage.",
    intro: "Morphy is White. He'd rather be watching the opera.",
    hook: 'From here, Morphy mates in TWO — the most famous finish in chess history.',
  },
  '0003-anderssen-immortal-1851': {
    subtitle:
      "London, 1851. Simpson's Divan.<br>Adolf Anderssen vs Lionel Kieseritzky —<br>a casual game between rounds that became<br>the most famous attack ever played.",
    intro: 'Anderssen is White. Everything he owns is about to be an offer.',
    hook: 'Two rooks and a bishop down — and from HERE he forces mate in two.',
  },
  '0004-anderssen-evergreen-1852': {
    hideHeroMoves: 5, // freeze before 20.Rxe7+ — the whole combination stays hidden
    portraitFile: 'anderssen-1863.jpg', // 1863 photograph — day 3 already used the engraving
    subtitle:
      "Berlin, 1852. One year after the Immortal,<br>Adolf Anderssen vs Jean Dufresne —<br>the game they call 'the evergreen<br>in the laurel wreath of chess.'",
    intro: "Anderssen is White. Black's attack looks faster. It isn't.",
    hook: 'Black mates NEXT MOVE. From here, Anderssen mates first.',
  },
  '0005-nimzowitsch-zugzwang-1923': {
    intro: 'Nimzowitsch is Black. No checkmate today — something stranger.',
    hook: 'From here, White LOSES without being mated — every move makes it worse.',
    postFact: 'The Immortal Zugzwang: White resigns with the board full of pieces.',
  },
  '0006-rubinstein-rotlewi-1907': {
    hideHeroMoves: 4, // freeze before 22…Rxc3!! — the queen offer starts the combination
    intro: "Rubinstein is Black. They call this one Rubinstein's Immortal.",
    hook: "From here, Rubinstein gives up his QUEEN — and it's completely winning.",
  },
  '0007-marshall-levitsky-1912': {
    hideHeroMoves: 1, // freeze one move before Qg3!!! — the gold-coins move itself
    intro: 'Marshall is Black. Legend says gold coins are about to fly.',
    hook: 'The next move made spectators shower the board with GOLD COINS.',
  },
  '0008-fischer-byrne-1956': {
    hideHeroMoves: 4, // freeze before 17…Be6!! — the queen sacrifice
    subtitle:
      'New York, 1956. Donald Byrne vs<br>a 13-year-old Bobby Fischer —<br>the Game of the Century.',
    intro: 'Fischer is Black. He is thirteen years old.',
    hook: 'From here, a 13-year-old gives up his QUEEN — on purpose.',
  },
  '0009-carlsen-nepo-2021': {
    subtitle:
      'Dubai, 2021. Game 6 of the World Championship —<br>Magnus Carlsen vs Ian Nepomniachtchi.<br>The longest world-title game ever played.',
    intro: 'Carlsen is White. 136 moves. This is where it breaks open.',
    hook: 'From here, Carlsen grinds out the win that broke Nepo.',
  },
  '0010-kasparov-world-1999': {
    subtitle:
      'The internet, 1999. Garry Kasparov vs<br>the World — fifty thousand players<br>voting on every move.',
    intro: 'Kasparov is White. His opponent: 50,000 people.',
    hook: 'From here, Kasparov beats the combined vote of fifty thousand players.',
  },
  '0011-deepblue-kasparov-1996': {
    subtitle:
      'Philadelphia, 1996. Deep Blue vs<br>Garry Kasparov — the first time a machine<br>ever beat a world champion in classical chess.',
    intro: 'The machine is White. History is about to be made.',
    hook: 'From here, the machine finishes the world champion.',
    years: 'IBM, 1985–1997',
    epithet: 'The Machine',
    bio: 'An IBM supercomputer evaluating two hundred million positions per second. In Philadelphia 1996 it became the first machine to beat a reigning world champion in a classical game — the moment the machines arrived.',
  },
  '0012-meitner-hamppe-1872': {
    intro: 'Meitner is Black. This one ends in the most beautiful draw ever played.',
    hook: 'From here: a king dragged across the board — and the Immortal Draw.',
    years: '1838–1910',
    epithet: 'The Immortal Drawer',
    bio: 'A Viennese master remembered for one game: the Immortal Draw of 1872, in which his king marches into the enemy army and survives by perpetual check — the most famous draw in chess history.',
  },
  '0013-canal-peruvian-1934': {
    intro: 'Canal is White — in a simul, against an amateur, about to make history.',
    hook: 'Both rooks are already gone. From here: the QUEEN too — and mate.',
    years: '1896–1981',
    epithet: 'The Peruvian',
    bio: 'A Peruvian grandmaster who spent his career in Europe. In a 1934 simultaneous exhibition he sacrificed both rooks and his queen for a two-piece mate — the Peruvian Immortal.',
  },
  '0014-najdorf-polish-1930': {
    intro: 'Najdorf is Black. Four pieces are about to be given away.',
    hook: 'From here, Najdorf sacrifices EVERYTHING — the Polish Immortal.',
    years: '1910–1997',
    epithet: 'El Viejo',
    bio: "The Polish-Argentine legend who gave his name to the most popular opening variation in chess. Twenty years earlier, as a young man in Warsaw, he played the Polish Immortal — sacrificing four pieces for a pawn-and-knight mate.",
  },
  '0015-fischer-spassky-1972': {
    subtitle:
      'Reykjavik, 1972. Game 6 of the Match of the Century —<br>Bobby Fischer vs Boris Spassky.<br>Even Spassky applauded.',
    intro: 'Fischer is White. His opponent will applaud when it ends.',
    hook: 'From here, Fischer plays so beautifully that SPASSKY joined the applause.',
  },
  '0016-kasparov-karpov-1985': {
    intro: 'Kasparov is Black. Watch the octopus knight on d3.',
    hook: "From here, the knight on d3 — 'the octopus' — decides a World Championship.",
  },
  '0017-carlsen-anand-2013-g5': {
    intro: 'Carlsen is White. No fireworks — just a grind nobody survives.',
    hook: 'From here, Carlsen converts a nothing-endgame into a world title.',
  },
  '0018-carlsen-karjakin-2016': {
    subtitle:
      'New York, 2016. The World Championship tiebreak —<br>Magnus Carlsen vs Sergey Karjakin.<br>Match point.',
    intro: 'Carlsen is White, on match point. Watch the queen.',
    hook: 'From here, Carlsen ends a World Championship with a QUEEN SACRIFICE.',
  },
  '0019-carlsen-anand-2013-g9': {
    intro: 'Carlsen is Black, defending — then suddenly he is not.',
    hook: "From here, one careless White move loses everything. Carlsen doesn't miss.",
  },
};
