import { LegendChessError } from '@legendchess/core';

/** The PGN could not be parsed or contains no usable game. */
export class PgnParseError extends LegendChessError {}

/** The curation config contradicts the PGN (wrong hero, window out of range, …). */
export class CurationError extends LegendChessError {}

/** The UCI engine misbehaved (option rejected, incomplete eval coverage, died). */
export class EngineError extends LegendChessError {}
