export const PACKAGE_NAME = '@playthelegend/forge';

export { CurationConfigSchema, type CurationConfig } from './config.js';
export { parseGame, type ParsedGame } from './pgn.js';
export { buildPuzzle, heroPly, puzzleToJson, type BuildInput } from './build.js';
export { createEngine, type Engine, type EngineOptions, type MoveEvaluator } from './engine.js';
export { gatePuzzle, type GateResult } from './gate.js';
export { lintPuzzle, type LintWarning } from './lint.js';
export { PgnParseError, CurationError, EngineError } from './errors.js';
