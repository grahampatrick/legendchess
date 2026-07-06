import { describe, expect, it } from 'vitest';

import { gamesBucket, streakBucket } from '../src/lib/analytics';

describe('retention buckets (coarse on purpose — no identifiers)', () => {
  it('streak: 1 | 2-6 | 7+', () => {
    expect(streakBucket(0)).toBe('1');
    expect(streakBucket(1)).toBe('1');
    expect(streakBucket(2)).toBe('2-6');
    expect(streakBucket(6)).toBe('2-6');
    expect(streakBucket(7)).toBe('7+');
    expect(streakBucket(125)).toBe('7+'); // Carlsen tier
  });

  it('games: 1 | 2-9 | 10+', () => {
    expect(gamesBucket(1)).toBe('1');
    expect(gamesBucket(2)).toBe('2-9');
    expect(gamesBucket(9)).toBe('2-9');
    expect(gamesBucket(10)).toBe('10+');
  });
});
