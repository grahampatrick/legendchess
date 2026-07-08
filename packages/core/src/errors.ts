export class LegendChessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The guess string is not syntactically valid UCI (e.g. "e2e9", "Nf3"). */
export class MalformedUciError extends LegendChessError {
  constructor(readonly uci: string) {
    super(`Not a valid UCI move string: "${uci}"`);
  }
}

/** The move is well-formed UCI but not legal in the current position. */
export class IllegalMoveError extends LegendChessError {
  constructor(
    readonly uci: string,
    readonly fen: string,
  ) {
    super(`Illegal move ${uci} in position ${fen}`);
  }
}

/** guess()/requestHint() called after the session finished. */
export class SessionCompleteError extends LegendChessError {
  constructor() {
    super('Session is already complete');
  }
}

/** All hint tiers for the current decision point are already revealed. */
export class NoMoreHintsError extends LegendChessError {
  constructor() {
    super('All hints for this decision point are already revealed');
  }
}

/** The puzzle document is internally inconsistent (bad replay, missing eval, …). */
export class PuzzleDataError extends LegendChessError {}
