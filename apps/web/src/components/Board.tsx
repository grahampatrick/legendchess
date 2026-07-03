'use client';

/**
 * Thin chessground wrapper. No rules here: legality arrives as a dests map,
 * moves leave as (from, to) callbacks. Everything else is core's business.
 */
import { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Config } from 'chessground/config';
import type { Key } from 'chessground/types';
import type { DrawShape } from 'chessground/draw';

export interface BoardProps {
  fen: string;
  orientation: 'white' | 'black';
  lastMove?: [string, string];
  check?: boolean;
  /** When set, the player may move these pieces; otherwise the board is view-only. */
  dests?: Map<string, string[]>;
  movableColor?: 'white' | 'black';
  shapes?: DrawShape[];
  animationMs?: number;
  onMove?: (from: string, to: string) => void;
  shake?: boolean;
  /** Bump to force a re-sync (e.g. snapping a missed guess back to the fen). */
  epoch?: number;
}

export default function Board({
  fen,
  orientation,
  lastMove,
  check = false,
  dests,
  movableColor,
  shapes = [],
  animationMs = 200,
  onMove,
  shake = false,
  epoch = 0,
}: BoardProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const onMoveRef = useRef<BoardProps['onMove']>(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    if (!hostRef.current) return;
    const config: Config = {
      fen,
      orientation,
      coordinates: true,
      animation: { enabled: true, duration: animationMs },
      movable: { free: false, showDests: true },
      draggable: { enabled: true, showGhost: true },
      selectable: { enabled: true },
      events: {
        move: (from: Key, to: Key) => onMoveRef.current?.(from, to),
      },
    };
    apiRef.current = Chessground(hostRef.current, config);
    return () => {
      apiRef.current?.destroy();
      apiRef.current = null;
    };
    // The api is created once; all later changes flow through api.set below.
  }, []);

  useEffect(() => {
    apiRef.current?.set({
      fen,
      orientation,
      lastMove: lastMove as [Key, Key] | undefined,
      check,
      turnColor: movableColor,
      animation: { duration: animationMs },
      movable: dests
        ? {
            free: false,
            color: movableColor,
            dests: dests as Map<Key, Key[]>,
            showDests: true,
          }
        : { free: false, color: undefined, dests: new Map() },
    });
    apiRef.current?.setShapes(shapes);
  }, [fen, orientation, lastMove, check, dests, movableColor, shapes, animationMs, epoch]);

  return (
    <div className={`board-wrap${shake ? ' shake' : ''}`} data-testid="board">
      <div ref={hostRef} />
    </div>
  );
}
