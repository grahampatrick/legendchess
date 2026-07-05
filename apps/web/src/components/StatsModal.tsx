'use client';

/**
 * Lifetime stats — the third leg of the retention trifecta (streak, stats,
 * share). Everything here derives from localStorage; no account, no network.
 */
import { useMemo } from 'react';

import { lifetimeStats, loadState } from '../lib/storage';

export interface StatsModalProps {
  /** Displayed (already date-adjusted) current streak, if known. */
  streakNow: number | null;
  onClose: () => void;
}

export default function StatsModal({ streakNow, onClose }: StatsModalProps) {
  const state = useMemo(() => loadState(), []);
  const stats = useMemo(() => lifetimeStats(state), [state]);
  const maxCount = Math.max(1, ...stats.distribution.map((d) => d.count));

  return (
    <div className="overlay" data-testid="stats" onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()}>
        <h2>Your record</h2>
        <div className="stats-row">
          <div className="stat">
            <div className="stat-num" data-testid="stat-played">
              {stats.played}
            </div>
            <div className="stat-label">played</div>
          </div>
          <div className="stat">
            <div className="stat-num">{stats.solveRate}%</div>
            <div className="stat-label">solved</div>
          </div>
          <div className="stat">
            <div className="stat-num">{streakNow ?? state.streak.current}</div>
            <div className="stat-label">streak</div>
          </div>
          <div className="stat">
            <div className="stat-num">{state.streak.best}</div>
            <div className="stat-label">best</div>
          </div>
        </div>
        <div className="stats-dist">
          {stats.distribution.map((d) => (
            <div className="dist-row" key={d.label}>
              <span className="dist-label">{d.label}</span>
              <span className="dist-bar-track">
                <span
                  className={`dist-bar${d.count > 0 ? '' : ' empty'}`}
                  style={{ width: `${Math.max(6, (d.count / maxCount) * 100)}%` }}
                >
                  {d.count}
                </span>
              </span>
            </div>
          ))}
        </div>
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
