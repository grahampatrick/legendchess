export const PACKAGE_NAME = '@playthelegend/forge';

export { CurationConfigSchema, type CurationConfig } from './config';
export { parseGame, type ParsedGame } from './pgn';
export { buildPuzzle, heroPly, puzzleToJson, type BuildInput } from './build';
export { createEngine, type Engine, type EngineOptions, type MoveEvaluator } from './engine';
export { gatePuzzle, type GateResult } from './gate';
export { lintPuzzle, type LintWarning } from './lint';
export { PgnParseError, CurationError, EngineError } from './errors';
