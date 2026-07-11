'use client';

/**
 * The game flow: intro → prelude replay → guess loop → reveal/spectate → done.
 * A thin adapter over core's session — no game rules live here (non-negotiable
 * #5); this component only sequences frames and renders state.
 *
 * Daily mode adds persistence: every guess/hint is appended to a localStorage
 * action log which replays through a fresh core session on reload — one
 * ruleset implementation, no serialized game state to drift (ADR 0004/0005).
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
  heartsOf,
  maxScore,
  scoreSession,
  type Hint,
  type SessionState,
} from '@legendchess/core';
import type { DrawShape } from 'chessground/draw';

import Board from './Board';
import { Confetti, CountUp, GridReveal } from './Celebration';
import Countdown from './Countdown';
import StatsModal from './StatsModal';
import { legendByHeroName } from '../data/legends';
import { gamesBucket, streakBucket, track } from '../lib/analytics';
import { destsFromUcis, promotionChoices } from '../lib/dests';
import { previousDateKey } from '../lib/daily';
import { percentile } from '../lib/stats';
import { playSound, setSoundEnabled, soundEnabled } from '../lib/sound';
import { unsealPuzzle, type SealedPuzzle } from '../lib/seal';
import {
  appendAction,
  completeDay,
  dayRecord,
  displayStreak,
  lifetimeStats,
  loadState,
  saveState,
  type DailyAction,
} from '../lib/storage';
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

export interface PlayViewProps {
  sealed: SealedPuzzle;
  mode: 'daily' | 'free';
  /** Daily context (both required in daily mode). */
  dayNumber?: number;
  dateKey?: string;
}

const FRAME_MS: Record<string, number> = { replay: 220, reveal: 500, spectate: 550 };

const hintText = (hint: Hint): string => {
  switch (hint.tier) {
    case 1:
      return `Hint: the ${hint.piece} moves.`;
    case 2:
      return `Hint: the move lands on ${hint.to}.`;
    case 3:
      return `Hint: the full move is shown on the board.`;
  }
};

export default function PlayView({ sealed, mode, dayNumber, dateKey }: PlayViewProps) {
  const puzzle = useMemo(() => unsealPuzzle(sealed), [sealed]);
  const sessionRef = useRef<ReturnType<typeof createSession> | null>(null);
  sessionRef.current ??= createSession(puzzle);
  const session = sessionRef.current;

  const heroLastName = puzzle.meta.heroName.split(' ').at(-1)!;
  const legend = legendByHeroName(puzzle.meta.heroName);
  const isDaily = mode === 'daily' && !!dateKey;

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
  const [streakNow, setStreakNow] = useState<number | null>(null);
  const [board, setBoard] = useState<string | null>(null); // leaderboard submit status
  const submittedRef = useRef(false);
  const [showRules, setShowRules] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [stats, setStats] = useState<{ foundFirstTry: number[]; scores: number[] } | null>(null);

  useEffect(() => {
    setSoundOn(soundEnabled());
    if (!isDaily) return;
    // Anonymous social proof — quietly absent when unconfigured or thin.
    void fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { usable?: boolean; foundFirstTry?: number[]; scores?: number[] } | null) => {
        if (d?.usable && d.foundFirstTry && d.scores) {
          setStats({ foundFirstTry: d.foundFirstTry, scores: d.scores });
        }
      })
      .catch(() => {});
  }, [isDaily]);

  const persist = (action: DailyAction, done: boolean) => {
    if (!isDaily || !dateKey) return;
    let state = appendAction(
      loadState(),
      dateKey,
      { dayNumber: dayNumber ?? 0, puzzleId: puzzle.id },
      action,
    );
    if (done) {
      const final = session.state();
      state = completeDay(state, dateKey, previousDateKey(dateKey), {
        score: scoreSession(final.records),
        max: maxScore(puzzle),
        solved: final.phase === 'solved',
        grid: emojiGrid(final.records),
      });
      setStreakNow(state.streak.current);
    }
    saveState(state);
  };

  // Daily restore: replay the stored action log through a fresh session.
  // Runs once, client-side only (localStorage), after hydration.
  useEffect(() => {
    if (!isDaily || !dateKey) return;
    const state = loadState();
    const record = dayRecord(state, dateKey);
    setStreakNow(displayStreak(state.streak, dateKey, previousDateKey(dateKey)));
    if (!record || record.puzzleId !== puzzle.id || record.actions.length === 0) return;
    try {
      const restored = createSession(puzzle);
      for (const action of record.actions) {
        if (action.type === 'hint') restored.requestHint();
        else restored.guess(action.uci);
      }
      sessionRef.current = restored;
      const restoredSnap = restored.state();
      setSnap(restoredSnap);
      setDisplay({ fen: restoredSnap.fen });
      if (restoredSnap.phase === 'playing') {
        setStatus({ kind: 'info', text: 'Welcome back — the legend is waiting.' });
        setPhase('play');
      } else {
        setPhase('done');
      }
    } catch {
      // Corrupt log (schema change, tampering): start the day fresh.
      const state2 = loadState();
      delete state2.days[dateKey];
      saveState(state2);
    }
    // (intentionally run once on mount)
  }, []);

  // On finishing the daily, submit the action log for server verification
  // (ADR 0006). Best-effort and additive: 401 → sign-in nudge, 503 → silent.
  useEffect(() => {
    if (phase !== 'done' || !isDaily || !dateKey || submittedRef.current) return;
    submittedRef.current = true;
    // persist() already wrote the completed day, so localStorage carries the
    // post-completion streak and lifetime count for the retention buckets.
    const stored = loadState();
    track('game_complete', {
      puzzle: puzzle.id,
      outcome: snap.phase,
      score: scoreSession(snap.records),
      streak: streakBucket(stored.streak.current),
      games: gamesBucket(lifetimeStats(stored).played),
      ...(dayNumber !== undefined ? { day: dayNumber } : {}),
    });
    const record = dayRecord(loadState(), dateKey);
    if (!record?.done) return;
    void fetch('/api/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dateKey, actions: record.actions }),
    })
      .then(async (res) => {
        if (res.status === 401) setBoard('signin');
        else if (res.ok) {
          const data = (await res.json()) as { outcome: string; score: number };
          setBoard(
            data.outcome === 'already-submitted'
              ? 'Already on today’s leaderboard.'
              : `On the leaderboard: ${data.score} pts.`,
          );
        }
      })
      .catch(() => {
        /* offline or unconfigured — the game owes the player nothing here */
      });
  }, [phase, isDaily, dateKey]);

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
    track('game_start', { puzzle: puzzle.id, mode });
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
      persist({ type: 'guess', uci }, outcome.done);
      setSnap(session.state());
      setHint(null);
      setShapes([]);
      setUciText('');

      if (outcome.result === 'miss') {
        playSound('miss');
        if (outcome.done) {
          setStatus({ kind: 'miss', text: `Out of lives. Watch how ${heroLastName} finished it.` });
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
      const found = stats?.foundFirstTry[before.currentIndex];
      const proof =
        outcome.result === 'exact' && found !== undefined ? ` ${found}% found it first try.` : '';
      playSound(outcome.done && session.state().phase === 'solved' ? 'solved' : outcome.result);
      setStatus(
        outcome.result === 'exact'
          ? { kind: 'exact', text: `${dp.hero.san} — exactly what ${heroLastName} played.${proof}` }
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
      track('hint_used', { puzzle: puzzle.id, tier: h.tier });
      persist({ type: 'hint' }, false);
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
    track('share_click', {
      puzzle: puzzle.id,
      ...(dayNumber !== undefined ? { day: dayNumber } : {}),
    });
    const text = formatShareText({ puzzle, state: snap, dayNumber });
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const [storyState, setStoryState] = useState<'idle' | 'busy' | 'shared' | 'downloaded'>('idle');
  const shareStory = async () => {
    track('share_story', {
      puzzle: puzzle.id,
      ...(dayNumber !== undefined ? { day: dayNumber } : {}),
    });
    setStoryState('busy');
    try {
      const { shareStoryCard } = await import('../lib/storyCard');
      const outcome = await shareStoryCard({
        title: puzzle.meta.title,
        heroName: puzzle.meta.heroName,
        event: puzzle.meta.event,
        year: puzzle.meta.year,
        ...(dayNumber !== undefined ? { dayNumber } : {}),
        grid: emojiGrid(snap.records),
        score: scoreSession(snap.records),
        max: maxScore(puzzle),
        livesLeft: snap.livesLeft,
        solved: snap.phase === 'solved',
      });
      setStoryState(outcome);
      setTimeout(() => setStoryState('idle'), 2500);
    } catch {
      setStoryState('idle');
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
  const hearts = heartsOf(snap.livesLeft, session.rules);
  const pointNumber = Math.min(snap.currentIndex + 1, puzzle.decisionPoints.length);
  const dayTag = dayNumber === undefined ? '' : `#${dayNumber} · `;

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
              <h2>
                {dayTag}
                {puzzle.meta.title}
              </h2>
              <div className="meta">
                {puzzle.meta.event} · {puzzle.meta.year} · vs {puzzle.meta.opponentName}
              </div>
              <div className="you-are">You are {puzzle.meta.heroName}.</div>
              {legend && (
                <div className="legend-line">
                  {legend.years} · {legend.epithet} ·{' '}
                  <a href={`/legends#${legend.slug}`}>meet the legend</a>
                </div>
              )}
              <p className="blurb">{puzzle.meta.blurb}</p>
              <div className="rules-strip" data-testid="rules-strip">
                Find the moves they actually played · 🟩 exact · 🟨 engine says just as good · ❤❤❤
                three lives
              </div>
              <button className="btn" data-testid="start-btn" onClick={startGame}>
                Take the board
              </button>
            </div>
          </div>
        )}
        {showStats && <StatsModal streakNow={streakNow} onClose={() => setShowStats(false)} />}
        {showRules && (
          <div className="overlay" data-testid="rules" onClick={() => setShowRules(false)}>
            <div className="card" onClick={(e) => e.stopPropagation()}>
              <h2>How to play</h2>
              <p className="blurb" style={{ textAlign: 'left' }}>
                Every day, one legendary game — you play it from the legend&apos;s side.
                <br />
                <br />
                🟩 You found the <strong>exact move</strong> they played.
                <br />
                🟨 The engine rates your move <strong>just as strong</strong> — the real game
                continues.
                <br />
                🟥 You needed misses or hints to get there.
                <br />
                ❤❤❤ A miss costs a life. Three misses, and you watch the legend finish without you.
                <br />
                <br />
                Move pieces by dragging, tapping, or typing (e.g. <code>e2e4</code>). Hints reveal
                the piece, then the square, then the move — each dims your square.
              </p>
              <button className="btn" onClick={() => setShowRules(false)}>
                Got it
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
            {snap.phase === 'solved' && <Confetti />}
            <div className="card">
              <h2>
                {snap.phase === 'solved'
                  ? `You played like ${heroLastName}.`
                  : 'The legend finishes without you.'}
              </h2>
              <GridReveal grid={finalGrid} />
              <div>
                <CountUp to={scoreSession(snap.records)} max={maxScore(puzzle)} suffix={hearts} />
              </div>
              {stats && (
                <div className="meta" data-testid="percentile">
                  Better than {percentile(scoreSession(snap.records), stats.scores)}% of
                  today&apos;s players
                </div>
              )}
              {isDaily && streakNow !== null && streakNow > 0 && (
                <div data-testid="streak">🔥 {streakNow}-day streak</div>
              )}
              {board === 'signin' ? (
                <div className="meta" data-testid="leaderboard-cta">
                  <a href="/account">Sign in</a> to enter <a href="/leaderboard">the leaderboard</a>
                </div>
              ) : board ? (
                <div className="meta" data-testid="leaderboard-cta">
                  {board} <a href="/leaderboard">View</a>
                </div>
              ) : null}
              <button className="btn" data-testid="share-btn" onClick={share}>
                {copied ? 'Copied!' : 'Share your result'}
              </button>
              <button className="btn btn-secondary" data-testid="story-btn" onClick={shareStory}>
                {storyState === 'busy'
                  ? 'Rendering…'
                  : storyState === 'shared'
                    ? 'Shared!'
                    : storyState === 'downloaded'
                      ? 'Image saved!'
                      : '📸 Story image'}
              </button>
              {isDaily && <Countdown />}
              <div>
                <button
                  className="link-btn"
                  data-testid="done-stats"
                  onClick={() => setShowStats(true)}
                >
                  Stats
                </button>{' '}
                · <a href="/archive">Archive</a> · <a href="/library">All puzzles</a>
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="panel">
        <div className="panel-head">
          <h1>
            {dayTag}
            {puzzle.meta.title}
          </h1>
          <div className="panel-tools">
            <button
              className="icon-btn"
              data-testid="stats-btn"
              title="Your record"
              onClick={() => setShowStats(true)}
            >
              📊
            </button>
            <button
              className="icon-btn"
              data-testid="sound-btn"
              title={soundOn ? 'Sound on' : 'Sound off'}
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                setSoundEnabled(next);
                if (next) playSound('exact');
              }}
            >
              {soundOn ? '🔊' : '🔇'}
            </button>
            <button
              className="icon-btn"
              data-testid="rules-btn"
              title="How to play"
              onClick={() => setShowRules(true)}
            >
              ?
            </button>
          </div>
        </div>
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
