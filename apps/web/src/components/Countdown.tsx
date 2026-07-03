'use client';

import { useEffect, useState } from 'react';

import { formatCountdown, msUntilNextUtcMidnight } from '../lib/daily';

/** Ticks down to the next UTC midnight; offers a reload when it arrives. */
export default function Countdown() {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setMs(msUntilNextUtcMidnight(new Date()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  if (ms === null) return null; // avoid a hydration mismatch on first paint
  if (ms <= 0 || ms >= 86_400_000) {
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
