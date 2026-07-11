'use client';

import { useEffect, useState } from 'react';

import { formatCountdown, msUntilNextRelease, releaseDateKey } from '../lib/daily';

/** Ticks down to the next 8am-Pacific release; offers a reload when it arrives. */
export default function Countdown({ dateKey }: { dateKey?: string }) {
  const [ms, setMs] = useState<number | null>(null);
  const [rolled, setRolled] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setMs(msUntilNextRelease(now));
      if (dateKey) setRolled(releaseDateKey(now) !== dateKey);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [dateKey]);

  if (ms === null) return null; // avoid a hydration mismatch on first paint
  if (rolled) {
    return (
      <button className="btn subtle" onClick={() => window.location.reload()}>
        The next legend is ready — play now
      </button>
    );
  }
  return (
    <div className="meta" data-testid="countdown">
      Next legend in <strong>{formatCountdown(ms)}</strong>
    </div>
  );
}
