/**
 * Motor de la partida: puro y determinista. Lo usa el cliente para jugar y el
 * servidor para re-simular y validar el puntaje — INSTRUCCIONES.md §4.1.
 */
import {
  clearCells,
  collapseAndRefill,
  createBoard,
  findRuns,
  hasAnyLegalSwap,
  isLegalSwap,
  reshuffleUntilPlayable,
  swapped,
  type Board,
} from './board';
import { Rng } from './rng';
import { emptyColorCounts, GAME_RULES, type ColorCounts } from './rules';
import { addColorCounts, cellsClearedByRuns, colorCountsForRuns, pointsForRuns } from './scoring';

export interface Move {
  a: number;
  b: number;
}

/** Un paso de cascada, con los tableros intermedios para animar en el cliente. */
export interface CascadeStep {
  clearedCells: number[];
  boardAfterClear: Board;
  boardAfterRefill: Board;
  gained: number;
  cascadeIndex: number;
}

export interface GameState {
  board: Board;
  score: number;
  colorCounts: ColorCounts;
  movesPlayed: number;
  rng: Rng;
}

export interface MoveResult {
  ok: boolean;
  state: GameState;
  /** Tablero con el intercambio aplicado, antes de que exploten las fichas. */
  boardAfterSwap: Board;
  steps: CascadeStep[];
  reshuffled: boolean;
}

export function createGame(seed: number): GameState {
  const rng = new Rng(seed);
  let board = createBoard(rng);
  if (!hasAnyLegalSwap(board)) board = reshuffleUntilPlayable(rng);

  return { board, score: 0, colorCounts: emptyColorCounts(), movesPlayed: 0, rng };
}

/**
 * Aplica un intercambio. Si es ilegal devuelve ok:false y el estado intacto —
 * el servidor trata un movimiento ilegal como intento de manipulación (§4.1).
 */
export function applyMove(state: GameState, move: Move): MoveResult {
  const rejected: MoveResult = {
    ok: false,
    state,
    boardAfterSwap: state.board,
    steps: [],
    reshuffled: false,
  };

  if (!isLegalSwap(state.board, move.a, move.b)) return rejected;

  const rng = state.rng.clone();
  const boardAfterSwap = swapped(state.board, move.a, move.b);

  let board = boardAfterSwap;
  let score = state.score;
  let colorCounts = state.colorCounts;
  const steps: CascadeStep[] = [];

  for (let cascadeIndex = 0; ; cascadeIndex += 1) {
    const runs = findRuns(board);
    if (runs.length === 0) break;

    const cleared = cellsClearedByRuns(runs);
    const gained = pointsForRuns(runs, cascadeIndex);
    const boardAfterClear = clearCells(board, cleared);
    const boardAfterRefill = collapseAndRefill(boardAfterClear, rng);

    score += gained;
    colorCounts = addColorCounts(colorCounts, colorCountsForRuns(runs, cleared));
    steps.push({
      clearedCells: [...cleared],
      boardAfterClear,
      boardAfterRefill,
      gained,
      cascadeIndex,
    });

    board = boardAfterRefill;
  }

  let reshuffled = false;
  if (!hasAnyLegalSwap(board)) {
    board = reshuffleUntilPlayable(rng);
    reshuffled = true;
  }

  return {
    ok: true,
    state: { board, score, colorCounts, movesPlayed: state.movesPlayed + 1, rng },
    boardAfterSwap,
    steps,
    reshuffled,
  };
}

export interface ReplayResult {
  valid: boolean;
  score: number;
  colorCounts: ColorCounts;
  rejectedAtMove: number | null;
}

/**
 * Re-simula la partida completa a partir de la semilla y el log de movimientos.
 * El puntaje que devuelve esta función es el ÚNICO que se guarda (§4.1).
 */
export function replayGame(seed: number, moves: Move[]): ReplayResult {
  if (moves.length > GAME_RULES.MAX_MOVES) {
    return { valid: false, score: 0, colorCounts: emptyColorCounts(), rejectedAtMove: GAME_RULES.MAX_MOVES };
  }

  let state = createGame(seed);

  for (let i = 0; i < moves.length; i += 1) {
    const move = moves[i];
    if (!move) continue;

    const result = applyMove(state, move);
    if (!result.ok) {
      return { valid: false, score: state.score, colorCounts: state.colorCounts, rejectedAtMove: i };
    }
    state = result.state;
  }

  return { valid: true, score: state.score, colorCounts: state.colorCounts, rejectedAtMove: null };
}
