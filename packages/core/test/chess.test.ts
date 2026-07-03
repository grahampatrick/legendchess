import { describe, expect, it } from 'vitest';

import {
  fenOf,
  initialPosition,
  legalUcis,
  playSan,
  playUci,
  sanOfUci,
  uciOfSan,
} from '../src/index.js';

describe('castling UCI convention (engine form, not chessops king-takes-rook)', () => {
  const castlingReady = () => {
    const pos = initialPosition();
    for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']) playSan(pos, san);
    return pos; // White may castle O-O
  };

  it('legalUcis lists e1g1, never e1h1', () => {
    const moves = legalUcis(castlingReady());
    expect(moves).toContain('e1g1');
    expect(moves).not.toContain('e1h1');
  });

  it('round-trips through SAN both ways', () => {
    const pos = castlingReady();
    expect(uciOfSan(pos, 'O-O')).toBe('e1g1');
    expect(sanOfUci(pos, 'e1g1')).toBe('O-O');
  });

  it('playUci accepts the engine form and castles correctly', () => {
    const pos = castlingReady();
    playUci(pos, 'e1g1');
    expect(fenOf(pos)).toMatch(/RNBQ1RK1/); // king on g1, rook on f1
  });

  it('queenside works too', () => {
    const pos = initialPosition();
    for (const san of ['d4', 'd5', 'Nc3', 'Nc6', 'Bf4', 'Bf5', 'Qd2', 'Qd7']) playSan(pos, san);
    expect(legalUcis(pos)).toContain('e1c1');
    playUci(pos, 'e1c1');
    expect(fenOf(pos)).toMatch(/2KR1BNR/);
  });
});
