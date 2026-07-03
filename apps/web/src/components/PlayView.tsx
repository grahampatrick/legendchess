'use client';

/**
 * The game flow: intro → prelude replay → guess loop → reveal/spectate → done.
 * A thin adapter over core's session — no game rules live here (non-negotiable
 * #5); this component only sequences frames and renders state.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  IllegalMoveError,
  MalformedUciError,
  NoMoreHintsError,
  createSession,
  emojiGrid,
  fenIsCheck,
  formatShareText,
  maxScore,
  scoreSession,
  validatePuzzle,
  type Hint,
  type SessionState,
} from '@playthelegend/core';
import type { DrawShape } from 'chessground/draw';

import Board from './Board';
import { destsFromUcis, promotionChoices } from '../lib/dests';
import {
  framesFromSan,
  preludeFrames,
  remainderFrames,
  revealFrames,
  type Frame,
} from '../lib/timeline';

type Phase = 'intro' | 'replay' | 'play' | 'reveal' | 'spectate' | 'done';

interface Status {
  kind: 'exact' | 'equivalent' | 'miss' | 'error' | 'info';
  text: string;
}

const FRAME_MS: Record<string, number> = { replay: 220, reveal: 500, spectate: 550 };
const PIECE_NAMES: Record<string, string> = {
  pawn: 'pawn',
  knight: 'knight',
  bishop: 'bishop',
  rook: 'rook',
  queen: 'queen',
  king: 'king',
};

const hintText = (hint: Hint): string => {
  switch (hint.tier) {
    case 1:
      return `Hint: the ${PIECE_NAMES[hint.piece] ?? hint.piece} moves.`;
    case 2:
      return `Hint: the move lands on ${hint.to}.`;
    case 3:
      return `Hint: the full move is shown on the board.`;
  }
};

export default function PlayView({ puzzleJson }: { puzzleJson: unknown }) {
  const puzzle = useMemo(() => validatePuzzle(puzzleJson), [puzzleJson]);
  const sessionRef = useRef<ReturnType<typeof createSession> | null>(null);
  sessionRef.current ??= createSession(puzzle);
  const session = sessionRef.current;

  const heroLastName = puzzle.meta.heroName.split(' ').at(-1)!;

  const [phase, setPhase] = useState<Phase>('intro');
  const [snap, setSnap] = useState<SessionState>(() => session.state());
  const [display, setDisplay] = useState<Frame>({ fen: puzzle.startFen });
  const [queue, setQueue] = useState<Frame[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [shapes, setShapes] = useState<DrawShape[]>([]);
  const [shake, setShake] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [promo, setPromo] = useState<{ from: string; to: string; choices: string[] } | null>(null);
  const [uciText, setUciText] = useState('');
  const [copied, setCopied] = useState(false);

  // Frame queue player: one frame per tick, speed depends on phase.
  useEffect(() => {
    const next = queue[0];
    if (!next) return;
    const t = setTimeout(() => {
      setDisplay(next);
      setQueue((q) => q.slice(1));
    }, FRAME_MS[phase] ?? 400);
    return () => clearTimeout(t);
  }, [queue, phase]);

  // Phase transitions when the queue drains.
  useEffect(() => {
    if (queue.length > 0) return;
    if (phase === 'replay' || phase === 'reveal') setPhase('play');
    if (phase === 'spectate') setPhase('done');
  }, [queue.length, phase]);

  const startGame = () => {
    const frames = preludeFrames(puzzle);
    setDisplay(frames[0]!);
    setQueue(frames.slice(1));
    setStatus({ kind: 'info', text: 'Replaying the game so far…' });
    setPhase('replay');
  };

  const skipReplay = () => {
    setQueue([]);
    setDisplay({ fen: puzzle.startFen });
    setStatus(null);
    setPhase('play');
  };

  const applyGuess = (uci: string) => {
    if (phase !== 'play') return;
    const before = session.state();
    try {
      const outcome = session.guess(uci);
      const after = session.state();
      setSnap(after);
      setHint(null);
      setShapes([]);
      setUciText('');

      if (outcome.result === 'miss') {
        if (outcome.done) {
          setStatus({
            kind: 'miss',
            text: `Out of lives. Watch how ${heroLastName} finished it.`,
          });
          setQueue(remainderFrames(puzzle, before.currentIndex, before.fen));
          setPhase('spectate');
        } else {
          setStatus({ kind: 'miss', text: `Not this one — ${heroLastName} saw deeper.` });
          if (outcome.hint) {
            setHint(outcome.hint);
            if (outcome.hint.tier === 3) {
              const h = outcome.hint.uci;
              setShapes([
                { orig: h.slice(0, 2), dest: h.slice(2, 4), brush: 'yellow' } as DrawShape,
              ]);
            }
          }
          setShake(true);
          setTimeout(() => setShake(false), 400);
          setEpoch((e) => e + 1); // snap the moved piece back
        }
        return;
      }

      const dp = puzzle.decisionPoints[before.currentIndex]!;
      setStatus(
        outcome.result === 'exact'
          ? { kind: 'exact', text: `${dp.hero.san} — exactly what ${heroLastName} played.` }
          : {
              kind: 'equivalent',
              text: `The engine rates your move just as strong — but ${heroLastName} played ${dp.hero.san}. The game continues on his path.`,
            },
      );
      const reveal = revealFrames(puzzle, before.currentIndex, before.fen);
      if (outcome.done) {
        const lastFen = reveal.at(-1)?.fen ?? before.fen;
        setQueue([...reveal, ...framesFromSan(lastFen, puzzle.finale.san)]);
        setPhase('spectate');
      } else {
        setQueue(reveal);
        setPhase('reveal');
      }
    } catch (e) {
      if (e instanceof MalformedUciError || e instanceof IllegalMoveError) {
        setStatus({ kind: 'error', text: `${uci} is not a legal move here.` });
      } else {
        throw e;
      }
    }
  };

  const onBoardMove = (from: string, to: string) => {
    const choices = promotionChoices(session.legalMoves(), from, to);
    if (choices.length > 0) {
      setPromo({ from, to, choices });
      return;
    }
    applyGuess(from + to);
  };

  const requestHint = () => {
    try {
      const h = session.requestHint();
      setSnap(session.state());
      setHint(h);
      if (h.tier === 3) {
        setShapes([
          { orig: h.uci.slice(0, 2), dest: h.uci.slice(2, 4), brush: 'yellow' } as DrawShape,
        ]);
      }
    } catch (e) {
      if (e instanceof NoMoreHintsError) {
        setStatus({ kind: 'info', text: 'No hints left for this move.' });
      } else {
        throw e;
      }
    }
  };

  const share = async () => {
    const text = formatShareText({ puzzle, state: snap });
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const playing = phase === 'play';
  const dests = playing && !promo ? destsFromUcis(session.legalMoves()) : undefined;
  // In-progress view shows unreached points as ⬜; the final/share grid is
  // core's canonical emojiGrid (⬛ for unreached) — one scoring presentation.
  const progressGrid = snap.records
    .map((r) => (r.resolved ? { 3: '🟩', 2: '🟨', 1: '🟥', 0: '⬛' }[r.resolved.level] : '⬜'))
    .join('');
  const finalGrid = emojiGrid(snap.records);
  const hearts =
    '❤'.repeat(snap.livesLeft) +
    (snap.livesLeft < session.rules.lives ? '♡'.repeat(session.rules.lives - snap.livesLeft) : '');
  const pointNumber = Math.min(snap.currentIndex + 1, puzzle.decisionPoints.length);

  return (
    <div className="play-grid">
      <div style={{ position: 'relative' }}>
        <Board
          fen={display.fen}
          orientation={puzzle.meta.heroColor}
          lastMove={display.lastMove}
          check={fenIsCheck(display.fen)}
          dests={dests}
          movableColor={playing ? puzzle.meta.heroColor : undefined}
          onMove={onBoardMove}
          shapes={shapes}
          shake={shake}
          animationMs={phase === 'replay' ? 160 : 220}
          epoch={epoch}
        />
        {phase === 'intro' && (
          <div className="overlay" data-testid="intro">
            <div className="card">
              <h2>{puzzle.meta.title}</h2>
              <div className="meta">
                {puzzle.meta.event} · {puzzle.meta.year} · vs {puzzle.meta.opponentName}
              </div>
              <div className="you-are">You are {puzzle.meta.heroName}.</div>
              <p className="blurb">{puzzle.meta.blurb}</p>
              <button className="btn" data-testid="start-btn" onClick={startGame}>
                Take the board
              </button>
            </div>
          </div>
        )}
        {promo && (
          <div className="overlay" data-testid="promo">
            <div className="card">
              <h2>Promote to</h2>
              <div className="promo-row">
                {promo.choices.map((uci) => (
                  <button
                    key={uci}
                    className="btn subtle"
                    onClick={() => {
                      setPromo(null);
                      applyGuess(uci);
                    }}
                  >
                    {{ q: '♕', r: '♖', b: '♗', n: '♘' }[uci[4] as 'q' | 'r' | 'b' | 'n']}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {phase === 'done' && (
          <div className="overlay" data-testid="done-card">
            <div className="card">
              <h2>
                {snap.phase === 'solved'
                  ? `You played like ${heroLastName}.`
                  : 'The legend finishes without you.'}
              </h2>
              <div className="result-grid" data-testid="grid">
                {finalGrid}
              </div>
              <div data-testid="final-score">
                {scoreSession(snap.records)} / {maxScore(puzzle)} · {hearts}
              </div>
              <button className="btn" data-testid="share-btn" onClick={share}>
                {copied ? 'Copied!' : 'Share your result'}
              </button>
              <a href="/">All puzzles</a>
            </div>
          </div>
        )}
      </div>

      <aside className="panel">
        <h1>{puzzle.meta.title}</h1>
        <div className="meta">
          {puzzle.meta.heroName} vs {puzzle.meta.opponentName} · {puzzle.meta.event} ·{' '}
          {puzzle.meta.year}
        </div>
        {phase === 'replay' && (
          <button className="btn subtle" data-testid="skip-btn" onClick={skipReplay}>
            Skip to the moment ≫
          </button>
        )}
        {(playing || phase === 'reveal' || phase === 'spectate' || phase === 'done') && (
          <>
            <div className="lives" data-testid="lives" aria-label={`${snap.livesLeft} lives left`}>
              {hearts}
            </div>
            <div className="result-grid" data-testid="progress-grid">
              {progressGrid}
            </div>
            {playing && (
              <div className="meta" data-testid="move-counter">
                Move {pointNumber} of {puzzle.decisionPoints.length} — what did {heroLastName} play?
              </div>
            )}
          </>
        )}
        <div className={`status-line ${status?.kind ?? ''}`} data-testid="status">
          {status?.text}
        </div>
        {hint && (
          <div className="hint-chip" data-testid="hint">
            {hintText(hint)}
          </div>
        )}
        {playing && (
          <>
            <div className="uci-row">
              <input
                className="uci"
                data-testid="uci-input"
                placeholder="or type a move, e.g. e2e4"
                value={uciText}
                onChange={(e) => setUciText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && uciText.trim()) applyGuess(uciText.trim());
                }}
              />
              <button
                className="btn subtle"
                data-testid="hint-btn"
                onClick={requestHint}
                title="Reveal a hint (downgrades this square)"
              >
                Hint
              </button>
            </div>
            <div className="meta">
              Hints and misses downgrade the square: 🟩 → 🟨 → 🟥. A miss costs a life.
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
