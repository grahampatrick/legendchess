/**
 * Daily social assets: a 1080×1350 post card and a 1080×1920 cliffhanger reel
 * for today's legend, written to ~/Desktop/legendchess-day{N}/ with captions.
 *
 * Deterministic — no network beyond Google Fonts at render time. The reel
 * plays the build-up and freezes one move before the famous finish (per-puzzle
 * copy in puzzles.config.mjs); the finish itself is never shown.
 *
 * Usage: node tools/social/generate.mjs [--force]
 * Cron-safe: exits 0 quickly if today's folder is already complete.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const FORCE = process.argv.includes('--force');

const requireCore = createRequire(path.join(REPO, 'packages/core/package.json'));
const requireWeb = createRequire(path.join(REPO, 'apps/web/package.json'));
const requireHere = createRequire(import.meta.url);

const { CONFIG } = await import(pathToFileURL(path.join(HERE, 'puzzles.config.mjs')));

// ---------- today's puzzle ----------
const releaseDateKey = (now) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now.getTime() - 8 * 3_600_000));

const calendar = JSON.parse(readFileSync(path.join(REPO, 'content/calendar.json'), 'utf8'));
const dateKey = releaseDateKey(new Date());
// LEGENDCHESS_DAY=<n> overrides today's day number (testing / regeneration).
const dayOverride = Number(process.env.LEGENDCHESS_DAY) || 0;
const dayIndex = dayOverride > 0 ? dayOverride - 1 : calendar.days.findIndex((d) => d.date === dateKey);
if (dayIndex === -1) {
  console.log(`no calendar entry for ${dateKey} — nothing to do`);
  process.exit(0);
}
const dayNumber = dayIndex + 1;
const puzzleId = calendar.days[dayIndex].puzzleId;
const outDir = path.join(homedir(), 'Desktop', `legendchess-day${dayNumber}`);
const postPng = path.join(outDir, `legendchess-day${dayNumber}-post.png`);
const reelMp4 = path.join(outDir, `legendchess-day${dayNumber}-reel.mp4`);
const captionsTxt = path.join(outDir, 'captions.txt');
if (!FORCE && existsSync(postPng) && existsSync(reelMp4) && existsSync(captionsTxt)) {
  console.log(`day ${dayNumber} assets already exist — done`);
  process.exit(0);
}

const puzzle = JSON.parse(readFileSync(path.join(REPO, `dist/puzzles/${puzzleId}.json`), 'utf8'));
const meta = puzzle.meta;
const cfg = CONFIG[puzzleId] ?? {};
const lastName = meta.heroName.split(' ').at(-1);
const heroWhite = meta.heroColor === 'white';
console.log(`day ${dayNumber}: ${puzzleId} (${meta.heroName}, ${meta.heroColor})`);

// ---------- legend data (portrait, bio) from the app ----------
const legendsTs = readFileSync(path.join(REPO, 'apps/web/src/data/legends.ts'), 'utf8');
function legendFor(heroName) {
  const idx = legendsTs.indexOf(`heroName: '${heroName}'`);
  if (idx === -1) return null;
  const chunk = legendsTs.slice(idx, idx + 1500);
  const pick = (key) => chunk.match(new RegExp(`${key}: '((?:[^'\\\\]|\\\\.)*)'`))?.[1]?.replaceAll("\\'", "'");
  return { years: pick('years'), epithet: pick('epithet'), bio: pick('bio'), portrait: pick('portrait') };
}
const legend = legendFor(meta.heroName);
const years = cfg.years ?? legend?.years ?? String(meta.year);
const epithet = cfg.epithet ?? legend?.epithet ?? meta.title;
const bio = (cfg.bio ?? legend?.bio ?? meta.blurb).replace(/\s+$/, '');
const portraitFile = cfg.portraitFile ?? legend?.portrait;
const portraitPath = portraitFile ? path.join(REPO, 'apps/web/public/legends', portraitFile) : null;

// ---------- frames via chessops ----------
// chessops is ESM-only (its dist/cjs is mislabeled); import the ESM build.
const chessopsDir = path.join(REPO, 'packages/core/node_modules/chessops');
const chessopsMod = (m) => import(pathToFileURL(path.join(chessopsDir, 'dist/esm', m + '.js')));
const { Chess } = await chessopsMod('chess');
const sanMod = await chessopsMod('san');
const fenMod = await chessopsMod('fen');
const utilMod = await chessopsMod('util');

const pos = Chess.default();
const frames = [{ fen: fenMod.makeFen(pos.toSetup()), san: null, last: null, phase: 'start' }];
const push = (san, phase) => {
  const move = sanMod.parseSan(pos, san);
  if (!move) throw new Error(`bad san ${san} in ${puzzleId}`);
  const last = [utilMod.makeSquare(move.from), utilMod.makeSquare(move.to)];
  sanMod.makeSanAndPlay(pos, move);
  frames.push({ fen: fenMod.makeFen(pos.toSetup()), san, last, phase });
};
puzzle.prelude.san.forEach((s) => push(s, 'prelude'));
for (const dp of puzzle.decisionPoints) {
  push(dp.hero.san, 'hero');
  if (dp.reply) push(dp.reply.san, 'reply');
}

// Freeze one frame before the hidden finish: default keeps the last two hero
// moves secret; 'all' hides every hero move (day-1 Kasparov treatment).
const heroIdx = frames.flatMap((f, i) => (f.phase === 'hero' ? [i] : []));
const hide = cfg.hideHeroMoves ?? 2;
const sliceAt = hide === 'all' ? heroIdx[0] : heroIdx[Math.max(0, heroIdx.length - hide)];
const shown = frames.slice(0, sliceAt);
const moment = shown.at(-1);
const [, toPlay, , , , fullMove] = moment.fen.split(' ');
const momentMoveNo = Number(fullMove);
const momentReadout = toPlay === 'w' ? `${momentMoveNo}. ?` : `${momentMoveNo}… ?`;
const toPlayWord = toPlay === 'w' ? 'WHITE' : 'BLACK';
console.log(`freeze at frame ${sliceAt - 1}: move ${momentMoveNo}, ${toPlayWord} to play`);

// ---------- shared render bits ----------
const cburnett = readFileSync(requireWeb.resolve('chessground/assets/chessground.cburnett.css'), 'utf8');
const pieces = {};
for (const m of cburnett.matchAll(/piece\.([a-z-]+)\.([a-z]+)[^{]*\{[^}]*url\('([^']+)'\)/g)) {
  pieces[`${m[2]}-${m[1]}`] = m[3];
}
const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
  <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff"/>
    <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#fff"/>
    <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#000" stroke="none"/>
    <circle cx="14.7" cy="16.0" r="2.6" stroke-width="1.0"/>
    <path d="M16.6 17.7 C 18.4 20.3, 17.6 23.5, 19.2 26.5 C 20.0 28, 19.6 29.5, 18.8 30.5" stroke-width="0.55" stroke-dasharray="0.9 0.7" fill="none"/>
  </g>
</svg>`;
const fontLink = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,500&display=swap">`;

// Board renderer shared by both pages; orientation follows the hero.
const boardJs = `
const NAMES = { p:'pawn', n:'knight', b:'bishop', r:'rook', q:'queen', k:'king' };
const files = 'abcdefgh';
const FLIP = ${JSON.stringify(!heroWhite)};
function buildCells(board) {
  const cells = {};
  const ranks = FLIP ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
  const cols = FLIP ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
  for (const r of ranks) for (const f of cols) {
    const d = document.createElement('div');
    d.className = 'sq ' + ((r + f) % 2 ? 'l' : 'd');
    board.appendChild(d); cells[files[f] + r] = d;
  }
  return cells;
}
function renderFen(cells, fen, last) {
  for (const c of Object.values(cells)) { c.classList.remove('hl'); c.querySelector('.pc')?.remove(); }
  fen.split(' ')[0].split('/').forEach((row, ri) => {
    let f = 0;
    for (const ch of row) {
      if (/\\d/.test(ch)) { f += +ch; continue; }
      const color = ch === ch.toUpperCase() ? 'white' : 'black';
      const pc = document.createElement('div');
      pc.className = 'pc';
      pc.style.backgroundImage = "url('" + PIECES[color + '-' + NAMES[ch.toLowerCase()]] + "')";
      cells[files[f] + (8 - ri)].appendChild(pc);
      f++;
    }
  });
  if (last) last.forEach(sq => cells[sq].classList.add('hl'));
}`;

// ---------- copy ----------
const heroColorWord = heroWhite ? 'White' : 'Black';
const titleWords = meta.title.split(' ');
const mid = Math.ceil(titleWords.length / 2);
const titleHtml = cfg.titleHtml ?? `${titleWords.slice(0, mid).join(' ')}<br>${titleWords.slice(mid).join(' ')}`;
const subtitle = cfg.subtitle ?? `${meta.site.replace(/ [A-Z]{3}$/, '')}, ${meta.year}.<br>${meta.heroName} vs ${meta.opponentName}.`;
const intro = cfg.intro ?? `${lastName} is ${heroColorWord}. Watch the position sharpen.`;
const takeover = `Now ${lastName} takes over — every ${heroColorWord} move is his to find.`;
const hook = cfg.hook ?? `From here, ${lastName} plays the finish that made this game famous.`;
const momentLabel = `${lastName} to play`;
const outroSub = `Play ${meta.title.startsWith('The') ? meta.title.toLowerCase().replace(/^the/, 'the') : meta.title} yourself — guess his moves, one by one. 5 lives. Engine-graded.`;

// ---------- reel page ----------
const reelHtml = `<!doctype html><html><head><meta charset="utf-8">${fontLink}<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1080px; height:1920px; background:#1b1a17; overflow:hidden;
         font-family:-apple-system,'Helvetica Neue',Arial,sans-serif; color:#efeae0; }
  .layer { position:absolute; inset:0; display:flex; flex-direction:column;
           align-items:center; justify-content:center; text-align:center;
           opacity:0; transition:opacity .45s ease; }
  .layer.on { opacity:1; }
  #title .kicker { font-size:40px; letter-spacing:14px; color:#7cb342; font-weight:700; }
  #title h1 { font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:118px; margin:36px 60px 44px; }
  #title p { font-size:44px; line-height:1.5; color:#b9b2a4; max-width:840px; }
  #game { justify-content:flex-start; padding-top:120px; }
  #game .brand { font-family:'Fraunces',Georgia,serif; font-size:48px; font-weight:700; margin-bottom:10px; }
  #game .brand span { color:#7cb342; }
  #caption { height:170px; display:flex; align-items:center; justify-content:center;
             font-size:50px; font-weight:700; line-height:1.3; max-width:940px; }
  #caption.hot { color:#7cb342; font-size:54px; }
  #board { width:1000px; height:1000px; display:grid;
           grid-template:repeat(8,1fr)/repeat(8,1fr); border-radius:8px; overflow:hidden;
           box-shadow:0 24px 80px rgba(0,0,0,.55); }
  .sq { position:relative; }
  .sq.l { background:#f0d9b5; } .sq.d { background:#b58863; }
  .sq.hl::after { content:''; position:absolute; inset:0; background:rgba(155,199,0,.41); }
  .sq .pc { position:absolute; inset:0; background-size:cover; z-index:2; }
  #readout { margin-top:54px; height:140px; font-size:96px; font-weight:800;
             font-variant-numeric:tabular-nums; }
  #readout small { font-size:48px; color:#8d8677; font-weight:600; display:block; }
  #readout.q { color:#7cb342; font-size:120px; }
  #outro { background:#7cb342; color:#14200a; }
  #outro .logo { width:360px; height:360px; margin-bottom:64px; }
  #outro .logo svg { width:100%; height:100%; }
  #outro h2 { font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:112px; margin:0 40px 30px; }
  #outro .sub { font-size:48px; line-height:1.5; max-width:880px; margin-bottom:56px; }
  #outro .grid { font-size:64px; letter-spacing:6px; margin-bottom:64px; }
  #outro .url { font-size:72px; font-weight:900; background:#14200a; color:#aee571;
                padding:28px 64px; border-radius:24px; }
  #outro .meta { margin-top:44px; font-size:40px; font-weight:700; opacity:.75; }
</style></head><body>
<div id="game" class="layer">
  <div class="brand">Legend<span>Chess</span> · Day ${dayNumber}</div>
  <div id="caption"></div>
  <div id="board"></div>
  <div id="readout"><small>&nbsp;</small>&nbsp;</div>
</div>
<div id="title" class="layer">
  <div class="kicker">LEGENDCHESS · DAY ${dayNumber}</div>
  <h1>${titleHtml}</h1>
  <p>${subtitle}</p>
</div>
<div id="outro" class="layer">
  <div class="logo">${logo}</div>
  <h2>Become ${lastName}</h2>
  <div class="sub">${outroSub}</div>
  <div class="grid">♞🟩🟩🟨🟩🟩</div>
  <div class="url">legendchess.com</div>
  <div class="meta">DAY ${dayNumber} · LIVE NOW · NEW LEGEND DAILY, 8 AM PT</div>
</div>
<script>
const FRAMES = ${JSON.stringify(shown)};
const PIECES = ${JSON.stringify(pieces)};
${boardJs}
const cells = buildCells(document.getElementById('board'));
const caption = document.getElementById('caption');
const readout = document.getElementById('readout');
const setCaption = (text, hot) => { caption.textContent = text; caption.classList.toggle('hot', !!hot); };
const HERO_LABEL = ${JSON.stringify(`${lastName} plays`)};
const setReadout = (i, frame) => {
  const white = i % 2 === 1;
  readout.classList.remove('q');
  const label = frame.phase === 'hero' ? HERO_LABEL : frame.phase === 'reply' ? 'the reply' : 'the opening';
  readout.innerHTML = '<small>' + label + '</small>' + Math.ceil(i / 2) + '.' + (white ? ' ' : '… ') + frame.san;
};
const firstHero = FRAMES.findIndex(f => f.phase === 'hero');
const steps = [];
let t = 300;
steps.push([t, () => document.getElementById('title').classList.add('on')]);
t += 3800;
steps.push([t, () => { document.getElementById('title').classList.remove('on');
                       document.getElementById('game').classList.add('on');
                       renderFen(cells, FRAMES[0].fen, null);
                       setCaption(${JSON.stringify(intro)}); }]);
t += 1600;
FRAMES.forEach((frame, i) => {
  if (i === 0) return;
  const hold = frame.phase === 'prelude' ? Math.max(240, Math.min(380, 9000 / firstHero)) : frame.phase === 'hero' ? 950 : 550;
  steps.push([t, () => {
    renderFen(cells, frame.fen, frame.last);
    setReadout(i, frame);
    if (i === firstHero) setCaption(${JSON.stringify(takeover)});
  }]);
  t += hold;
});
t += 900;
steps.push([t, () => {
  setCaption(${JSON.stringify(hook)}, true);
  readout.classList.add('q');
  readout.innerHTML = '<small>${momentLabel}</small>${momentReadout}';
}]);
t += 2800;
steps.push([t, () => setCaption('Would YOU find it?', true)]);
t += 2200;
steps.push([t, () => { document.getElementById('game').classList.remove('on');
                       document.getElementById('outro').classList.add('on'); }]);
t += 4500;
steps.push([t, () => { window.__finished = true; }]);
document.fonts.ready.then(() => { for (const [at, fn] of steps) setTimeout(fn, at); });
window.__total = t;
</script></body></html>`;

// ---------- post page ----------
// No free photograph exists for some legends (Canal, Meitner, Najdorf, Deep
// Blue). Never fabricate a likeness — render a vintage monogram crest instead.
const initials = meta.heroName.split(' ').map((w) => w[0]).join('').toUpperCase();
const portraitBlock = portraitPath
  ? `<div class="pframe"><img class="portrait" src="${pathToFileURL(portraitPath)}"></div>`
  : `<div class="pframe crest">
      <div class="crest-ring">
        <div class="crest-mono">${initials}</div>
        <div class="crest-knight">${logo.replace('<svg ', '<svg width="64" height="64" ')}</div>
        <div class="crest-era">${years.replace(/–/g, ' – ')}</div>
      </div>
    </div>`;
const postFact = cfg.postFact ? ` ${cfg.postFact}` : '';
const postHtml = `<!doctype html><html><head><meta charset="utf-8">${fontLink}<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1080px; height:1350px; background:#1b1a17; overflow:hidden;
         font-family:-apple-system,'Helvetica Neue',Arial,sans-serif; color:#efeae0; }
  .frame { position:absolute; inset:34px; border:3px solid #3a3835; border-radius:6px; }
  .frame2 { position:absolute; inset:46px; border:1.5px solid #3a3835; border-radius:4px; }
  .wrap { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center;
          text-align:center; padding:68px 90px; }
  .brand { font-family:'Fraunces',Georgia,serif; font-size:44px; font-weight:700; }
  .brand span { color:#7cb342; }
  .kicker { margin-top:8px; font-size:25px; letter-spacing:8px; color:#8d8677; font-weight:700; }
  .row { margin-top:34px; display:flex; gap:36px; align-items:flex-start; }
  .pframe { border:5px solid #7cb342; border-radius:8px; box-shadow:0 24px 70px rgba(0,0,0,.6);
            font-size:0; }
  .pframe.crest { width:376px; height:420px; background:#262421; display:flex;
            align-items:center; justify-content:center; font-size:initial; }
  .crest-ring { width:316px; height:360px; border:2px solid #6b665c; border-radius:8px;
            outline:1px solid #46433c; outline-offset:6px; display:flex; flex-direction:column;
            align-items:center; justify-content:center; gap:18px; }
  .crest-mono { font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:130px;
            color:#efeae0; line-height:1; }
  .crest-knight svg { display:block; }
  .crest-era { font-size:22px; letter-spacing:4px; color:#8d8677; font-weight:700; }
  .portrait { width:376px; height:420px; object-fit:cover; object-position:top; border-radius:4px;
              filter:grayscale(1) sepia(.35) contrast(1.05); }
  .boardcol { display:flex; flex-direction:column; align-items:center; }
  #board { width:420px; height:420px; display:grid; grid-template:repeat(8,1fr)/repeat(8,1fr);
           border-radius:6px; overflow:hidden; border:5px solid #3a3835;
           box-shadow:0 24px 70px rgba(0,0,0,.6); }
  .sq { position:relative; }
  .sq.l { background:#f0d9b5; } .sq.d { background:#b58863; }
  .sq.hl::after { content:''; position:absolute; inset:0; background:rgba(155,199,0,.41); }
  .sq .pc { position:absolute; inset:0; background-size:cover; }
  .boardlabel { margin-top:14px; font-size:24px; font-weight:700; letter-spacing:3px; color:#8d8677; }
  h1 { font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:72px; margin-top:30px; }
  .years { margin-top:8px; font-size:32px; color:#7cb342; font-weight:700; }
  .epithet { margin-top:6px; font-family:'Fraunces',Georgia,serif; font-style:italic; font-weight:500; font-size:35px; color:#b9b2a4; }
  .bio { margin-top:26px; font-size:28px; line-height:1.5; color:#cfc8ba; max-width:900px; }
  .foot { margin-top:auto; }
  .foot .today { font-size:29px; font-weight:800; letter-spacing:5px; color:#7cb342; }
  .foot .url { margin-top:12px; font-size:40px; font-weight:900; }
</style></head><body>
<div class="frame"></div><div class="frame2"></div>
<div class="wrap">
  <div class="brand">Legend<span>Chess</span></div>
  <div class="kicker">TODAY'S LEGEND · DAY ${dayNumber}</div>
  <div class="row">
    ${portraitBlock}
    <div class="boardcol">
      <div id="board"></div>
      <div class="boardlabel">MOVE ${momentMoveNo} · ${toPlayWord} TO PLAY</div>
    </div>
  </div>
  <h1>${meta.heroName}</h1>
  <div class="years">${years}</div>
  <div class="epithet">“${epithet}”</div>
  <div class="bio">${(bio + postFact).replace(/[.\s]+$/, '')} — and today, you play it.</div>
  <div class="foot">
    <div class="today">${meta.title.toUpperCase()} · LIVE NOW</div>
    <div class="url">legendchess.com</div>
  </div>
</div>
<script>
const PIECES = ${JSON.stringify(pieces)};
${boardJs}
const cells = buildCells(document.getElementById('board'));
renderFen(cells, ${JSON.stringify(moment.fen)}, ${JSON.stringify(moment.last)});
</script></body></html>`;

// ---------- render ----------
const work = path.join(tmpdir(), `legendchess-social-${dayNumber}`);
mkdirSync(work, { recursive: true });
writeFileSync(path.join(work, 'reel.html'), reelHtml);
writeFileSync(path.join(work, 'post.html'), postHtml);
mkdirSync(outDir, { recursive: true });

const pw = await import(pathToFileURL(requireWeb.resolve('@playwright/test')));
const chromium = pw.chromium ?? pw.default.chromium;
const browser = await chromium.launch();
const postPage = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
await postPage.goto(pathToFileURL(path.join(work, 'post.html')).href);
await postPage.evaluate(() => document.fonts.ready);
await postPage.waitForTimeout(500);
await postPage.screenshot({ path: postPng });
await postPage.close();

const context = await browser.newContext({
  viewport: { width: 1080, height: 1920 },
  recordVideo: { dir: work, size: { width: 1080, height: 1920 } },
});
const reelPage = await context.newPage();
await reelPage.goto(pathToFileURL(path.join(work, 'reel.html')).href);
await reelPage.waitForFunction('window.__finished === true', null, { timeout: 180_000 });
const video = reelPage.video();
await context.close();
const webm = await video.path();
await browser.close();

const ffmpeg = requireHere('ffmpeg-static');
execFileSync(ffmpeg, ['-y', '-i', webm, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
  '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', reelMp4], { stdio: 'ignore' });

// ---------- captions ----------
const legendTag = lastName.toLowerCase().replace(/[^a-z]/g, '');
const gameTag = meta.title.toLowerCase().replace(/[^a-z]/g, '');
const captions = `DAY ${dayNumber} — ${meta.title} (${meta.heroName}, ${meta.year})

=== POST CAPTION ===
Day ${dayNumber}. Today's Legend: ${meta.heroName}, ${epithet}.

${meta.event} · ${meta.year}. This is the exact position at move ${momentMoveNo} — ${toPlayWord.toLowerCase()} to play. ${(() => { const h = hook.replace('From here, ', ''); return h[0].toUpperCase() + h.slice(1); })()}

Can you find what ${lastName} found? One legendary game a day. 5 lives. Link in bio ♞

#chess #chesspuzzle #dailychess #${legendTag} #${gameTag} #legendchess

=== REEL CAPTION ===
${intro} ${meta.year}.

We're not showing the finish — today YOU step into ${lastName}'s shoes and find it yourself.

5 lives. Engine-graded. Day ${dayNumber} is live → legendchess.com

#chess #chesspuzzle #dailychess #${legendTag} #${gameTag} #chessreels #legendchess
`;
writeFileSync(captionsTxt, captions);
console.log(`done → ${outDir}`);
