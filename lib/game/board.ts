/**
 * Lógica pura del tablero — sin React, sin DOM, sin red (INSTRUCCIONES.md §3).
 * El tablero es un arreglo plano de ROWS*COLS; cada celda guarda un índice de
 * color o EMPTY.
 */
import { COLOR_COUNT, GAME_RULES, TILE_COUNT } from './rules';
import type { Rng } from './rng';

export const EMPTY = -1;

export type Board = number[];

export interface Run {
  cells: number[];
  color: number;
}

export function indexOf(row: number, col: number): number {
  return row * GAME_RULES.COLS + col;
}

export function rowOf(index: number): number {
  return Math.floor(index / GAME_RULES.COLS);
}

export function colOf(index: number): number {
  return index % GAME_RULES.COLS;
}

export function areAdjacent(a: number, b: number): boolean {
  const rowDistance = Math.abs(rowOf(a) - rowOf(b));
  const colDistance = Math.abs(colOf(a) - colOf(b));
  return rowDistance + colDistance === 1;
}

export function isInsideBoard(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < TILE_COUNT;
}

function colorAt(board: Board, row: number, col: number): number {
  return board[indexOf(row, col)] ?? EMPTY;
}

/**
 * Crea un tablero inicial sin combinaciones ya hechas: al elegir el color de
 * cada celda se descartan los que completarían una línea con los vecinos ya
 * colocados (izquierda y arriba).
 */
export function createBoard(rng: Rng): Board {
  const board: Board = new Array<number>(TILE_COUNT).fill(EMPTY);

  for (let row = 0; row < GAME_RULES.ROWS; row += 1) {
    for (let col = 0; col < GAME_RULES.COLS; col += 1) {
      const forbidden = new Set<number>();

      if (col >= 2 && colorAt(board, row, col - 1) === colorAt(board, row, col - 2)) {
        forbidden.add(colorAt(board, row, col - 1));
      }
      if (row >= 2 && colorAt(board, row - 1, col) === colorAt(board, row - 2, col)) {
        forbidden.add(colorAt(board, row - 1, col));
      }

      const choices: number[] = [];
      for (let color = 0; color < COLOR_COUNT; color += 1) {
        if (!forbidden.has(color)) choices.push(color);
      }
      board[indexOf(row, col)] = choices[rng.nextInt(choices.length)] ?? 0;
    }
  }

  return board;
}

function collectRunsAlongLine(cellsInLine: number[], board: Board, runs: Run[]): void {
  let runStart = 0;

  for (let position = 1; position <= cellsInLine.length; position += 1) {
    const current = position < cellsInLine.length ? board[cellsInLine[position] as number] : EMPTY;
    const previous = board[cellsInLine[runStart] as number];
    const runEnded = current !== previous;
    if (!runEnded) continue;

    const length = position - runStart;
    if (previous !== undefined && previous !== EMPTY && length >= GAME_RULES.MIN_MATCH) {
      runs.push({ cells: cellsInLine.slice(runStart, position), color: previous });
    }
    runStart = position;
  }
}

/** Todas las líneas de 3 o más, horizontales y verticales. */
export function findRuns(board: Board): Run[] {
  const runs: Run[] = [];

  for (let row = 0; row < GAME_RULES.ROWS; row += 1) {
    const line: number[] = [];
    for (let col = 0; col < GAME_RULES.COLS; col += 1) line.push(indexOf(row, col));
    collectRunsAlongLine(line, board, runs);
  }

  for (let col = 0; col < GAME_RULES.COLS; col += 1) {
    const line: number[] = [];
    for (let row = 0; row < GAME_RULES.ROWS; row += 1) line.push(indexOf(row, col));
    collectRunsAlongLine(line, board, runs);
  }

  return runs;
}

export function swapped(board: Board, a: number, b: number): Board {
  const next = board.slice();
  const tileA = next[a];
  const tileB = next[b];
  if (tileA === undefined || tileB === undefined) return next;
  next[a] = tileB;
  next[b] = tileA;
  return next;
}

/** Un intercambio solo es legal si deja al menos una línea formada (§2.3). */
export function isLegalSwap(board: Board, a: number, b: number): boolean {
  if (!isInsideBoard(a) || !isInsideBoard(b)) return false;
  if (!areAdjacent(a, b)) return false;
  return findRuns(swapped(board, a, b)).length > 0;
}

export function clearCells(board: Board, cells: Iterable<number>): Board {
  const next = board.slice();
  for (const cell of cells) next[cell] = EMPTY;
  return next;
}

/** Gravedad + relleno desde el techo con la misma secuencia del PRNG. */
export function collapseAndRefill(board: Board, rng: Rng): Board {
  const next = board.slice();

  for (let col = 0; col < GAME_RULES.COLS; col += 1) {
    let writeRow = GAME_RULES.ROWS - 1;

    for (let readRow = GAME_RULES.ROWS - 1; readRow >= 0; readRow -= 1) {
      const tile = next[indexOf(readRow, col)];
      if (tile === undefined || tile === EMPTY) continue;
      next[indexOf(writeRow, col)] = tile;
      writeRow -= 1;
    }

    for (let row = writeRow; row >= 0; row -= 1) {
      next[indexOf(row, col)] = rng.nextInt(COLOR_COUNT);
    }
  }

  return next;
}

export function hasAnyLegalSwap(board: Board): boolean {
  for (let row = 0; row < GAME_RULES.ROWS; row += 1) {
    for (let col = 0; col < GAME_RULES.COLS; col += 1) {
      const current = indexOf(row, col);
      if (col + 1 < GAME_RULES.COLS && isLegalSwap(board, current, indexOf(row, col + 1))) {
        return true;
      }
      if (row + 1 < GAME_RULES.ROWS && isLegalSwap(board, current, indexOf(row + 1, col))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Si el tablero se queda sin movimientos posibles se rebaraja (§2.3): no hay
 * estado perdedor. Se reparte de cero para garantizar que quede jugable.
 */
export function reshuffleUntilPlayable(rng: Rng): Board {
  let board = createBoard(rng);
  let attempts = 0;
  while (!hasAnyLegalSwap(board) && attempts < 20) {
    board = createBoard(rng);
    attempts += 1;
  }
  return board;
}
