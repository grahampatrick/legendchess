import { PlayTheLegendError } from '@playthelegend/core';

/** The PGN could not be parsed or contains no usable game. */
export class PgnParseError extends PlayTheLegendError {}

/** The curation config contradicts the PGN (wrong hero, window out of range, …). */
export class CurationError extends PlayTheLegendError {}

/** The UCI engine misbehaved (option rejected, incomplete eval coverage, died). */
export class EngineError extends PlayTheLegendError {}
