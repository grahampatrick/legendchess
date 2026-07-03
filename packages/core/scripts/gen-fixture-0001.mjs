/**
 * One-off authoring aid for fixture 0001 (Kasparov–Topalov, Wijk aan Zee 1999).
 *
 * Replays the verified movetext, and for each hero decision point asks a local
 * Stockfish (MultiPV = all legal moves) for a centipawn eval of every legal
 * move, then writes fixtures/puzzles/0001-kasparov-topalov-1999.json.
 *
 * Kept for provenance: this is how the "hand-authored" M1 fixture's numbers
 * were produced. Superseded by @playthelegend/forge in M2.
 *
 * Usage: node packages/core/scripts/gen-fixture-0001.mjs [stockfish-path]
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Chess } from 'chessops/chess';
import { makeFen } from 'chessops/fen';
import { makeSan, parseSan } from 'chessops/san';
import { makeUci, squareRank } from 'chessops/util';

const STOCKFISH = process.argv[2] ?? 'stockfish';
const DEPTH = 18;
const MATE_CP = 100000;

// Verified against https://en.wikipedia.org/wiki/Kasparov%27s_Immortal (bare movetext only).
const SAN_MOVES = (
  'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 c6 f3 b5 Nge2 Nbd7 Bh6 Bxh6 Qxh6 Bb7 ' +
  'a3 e5 O-O-O Qe7 Kb1 a6 Nc1 O-O-O Nb3 exd4 Rxd4 c5 Rd1 Nb6 g3 Kb8 Na5 Ba8 ' +
  'Bh3 d5 Qf4+ Ka7 Rhe1 d4 Nd5 Nbxd5 exd5 Qd6 Rxd4 cxd4 Re7+ Kb6 Qxd4+ Kxa5 ' +
  'b4+ Ka4 Qc3 Qxd5 Ra7 Bb7 Rxb7 Qc4 Qxf6 Kxa3 Qxa6+ Kxb4 c3+ Kxc3 Qa1+ Kd2 ' +
  'Qb2+ Kd1 Bf1 Rd2 Rd7 Rxd7 Bxc4 bxc4 Qxh8 Rd3 Qa8 c3 Qa4+ Ke1 f4 f5 Kc1 Rd2 Qa7'
).split(/\s+/);

const PRELUDE_PLIES = 46; // through 23...Qd6
const DECISION_POINTS = 10; // White's moves 24–33
const HERO_PLIES = DECISION_POINTS * 2; // hero move + reply, plies 47–66

const legalUcis = (pos) => {
  const ucis = [];
  for (const [from, tos] of pos.allDests()) {
    const isPawn = pos.board.get(from)?.role === 'pawn';
    for (const to of tos) {
      if (isPawn && (squareRank(to) === 0 || squareRank(to) === 7)) {
        for (const promotion of ['queen', 'rook', 'bishop', 'knight'])
          ucis.push(makeUci({ from, to, promotion }));
      } else ucis.push(makeUci({ from, to }));
    }
  }
  return ucis;
};

// ---- replay the game, collecting structure -------------------------------
const pos = Chess.default();
const prelude = [];
const points = []; // { ply, fen, heroUci, heroSan, replyUci, replySan, legal }
const finale = [];
let startFen;

for (let i = 0; i < SAN_MOVES.length; i++) {
  const san = SAN_MOVES[i];
  const move = parseSan(pos, san);
  if (!move) throw new Error(`Illegal SAN at ply ${i + 1}: ${san} (fen ${makeFen(pos.toSetup())})`);
  const canonicalSan = makeSan(pos, move);
  const uci = makeUci(move);
  if (i < PRELUDE_PLIES) {
    prelude.push(canonicalSan);
  } else if (i < PRELUDE_PLIES + HERO_PLIES) {
    const offset = i - PRELUDE_PLIES;
    if (offset % 2 === 0) {
      points.push({
        ply: i + 1,
        fen: makeFen(pos.toSetup()),
        heroUci: uci,
        heroSan: canonicalSan,
        legal: legalUcis(pos),
        replyUci: null,
        replySan: null,
      });
    } else {
      const dp = points[points.length - 1];
      dp.replyUci = uci;
      dp.replySan = canonicalSan;
    }
  } else {
    finale.push(canonicalSan);
  }
  if (i === PRELUDE_PLIES) startFen = makeFen(pos.toSetup());
  pos.play(move);
}

console.log(`prelude ${prelude.length} plies, ${points.length} decision points, finale ${finale.length} plies`);
console.log(`startFen: ${startFen}`);

// ---- Stockfish: eval every legal move at each decision point -------------
const engine = spawn(STOCKFISH);
const lines = [];
let wake = null;
engine.stdout.on('data', (d) => {
  for (const line of d.toString().split('\n')) if (line.trim()) lines.push(line.trim());
  if (wake) wake();
});
const send = (cmd) => engine.stdin.write(cmd + '\n');
const waitFor = (predicate) =>
  new Promise((resolve) => {
    const check = () => {
      const i = lines.findIndex(predicate);
      if (i >= 0) {
        const found = lines[i];
        lines.length = 0;
        resolve(found);
      } else wake = check;
    };
    check();
  });

send('uci');
await waitFor((l) => l === 'uciok');
send(`setoption name Threads value ${Math.max(1, os.availableParallelism() - 2)}`);
send('setoption name Hash value 512');
// SF 18 caps MultiPV at 256 and silently ignores out-of-range values.
send('setoption name MultiPV value 256');
send('isready');
await waitFor((l) => l === 'readyok');

for (const dp of points) {
  const collected = new Map(); // uci -> { depth, cp }
  const onLine = (l) => {
    const m = l.match(
      /^info depth (\d+) .*?multipv (\d+) score (cp|mate) (-?\d+)(?: (?:lower|upper)bound)? .*?pv ([a-h][1-8][a-h][1-8][qrbn]?)/,
    );
    if (!m) return false;
    if (/(lower|upper)bound/.test(l)) return false;
    const [, depth, , kind, val, uci] = m;
    const prev = collected.get(uci);
    const cp =
      kind === 'cp'
        ? Number(val)
        : Number(val) > 0
          ? MATE_CP - Number(val)
          : -MATE_CP - Number(val);
    if (!prev || Number(depth) >= prev.depth) collected.set(uci, { depth: Number(depth), cp });
    return false;
  };
  send('ucinewgame');
  send(`position fen ${dp.fen}`);
  send(`go depth ${DEPTH}`);
  // Drain lines continuously until bestmove, feeding onLine.
  for (;;) {
    const line = await new Promise((resolve) => {
      const check = () => {
        const l = lines.shift();
        if (l !== undefined) resolve(l);
        else wake = check;
      };
      check();
    });
    onLine(line);
    if (line.startsWith('bestmove')) break;
  }
  dp.evals = Object.fromEntries(
    [...collected.entries()].map(([uci, { cp }]) => [uci, Math.round(cp)]),
  );
  const missing = dp.legal.filter((u) => !(u in dp.evals));
  const extra = Object.keys(dp.evals).filter((u) => !dp.legal.includes(u));
  if (missing.length || extra.length)
    throw new Error(
      `ply ${dp.ply}: eval coverage mismatch. missing=[${missing}] extra=[${extra}]`,
    );
  const heroCp = dp.evals[dp.heroUci];
  const best = Math.max(...Object.values(dp.evals));
  console.log(
    `ply ${dp.ply} ${dp.heroSan}: ${dp.legal.length} legal moves, hero=${heroCp}cp, best=${best}cp`,
  );
}
send('quit');

// ---- emit fixture ---------------------------------------------------------
const puzzle = {
  schemaVersion: 1,
  id: '0001-kasparov-topalov-1999',
  meta: {
    title: "Kasparov's Immortal",
    event: 'Hoogovens Tournament, Wijk aan Zee',
    site: 'Wijk aan Zee NED',
    year: 1999,
    heroName: 'Garry Kasparov',
    heroColor: 'white',
    opponentName: 'Veselin Topalov',
    result: '1-0',
    blurb:
      'Round 4, Wijk aan Zee, January 1999. Topalov has just dropped his queen back to d6, ' +
      'offering a trade that would drain all the venom from the position. You are Garry ' +
      'Kasparov — and the next ten moves are often called the greatest combination ever ' +
      'played: a rook sacrifice that sends the black king marching from a7 into your half ' +
      'of the board, never to return.',
    sources: ['https://en.wikipedia.org/wiki/Kasparov%27s_Immortal'],
  },
  prelude: { san: prelude },
  startFen,
  decisionPoints: points.map((p) => ({
    ply: p.ply,
    hero: { uci: p.heroUci, san: p.heroSan },
    evals: p.evals,
    reply: p.replyUci ? { uci: p.replyUci, san: p.replySan } : null,
  })),
  finale: { san: finale },
};

const out = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../fixtures/puzzles/0001-kasparov-topalov-1999.json',
);
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(puzzle, null, 2) + '\n');
console.log(`wrote ${out}`);
