/**
 * Pruebas mínimas exigidas por INSTRUCCIONES.md §5.1.
 * Ejecutar con: npm test
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearCells,
  collapseAndRefill,
  createBoard,
  EMPTY,
  findRuns,
  hasAnyLegalSwap,
  indexOf,
  isLegalSwap,
  type Board,
} from '../lib/game/board';
import { applyMove, createGame, replayGame, type Move } from '../lib/game/engine';
import { companyFor } from '../lib/game/company';
import { Rng } from '../lib/game/rng';
import { GAME_RULES, TILE_COUNT, dominantColorIndex } from '../lib/game/rules';
import { cellsClearedByRuns, pointsForRuns } from '../lib/game/scoring';
import { registerSchema } from '../lib/server/validation';

function boardOfColor(color: number): Board {
  return new Array<number>(TILE_COUNT).fill(color);
}

/** Tablero base sin líneas: patrón diagonal con 5 colores. */
function neutralBoard(): Board {
  const board: Board = [];
  for (let row = 0; row < GAME_RULES.ROWS; row += 1) {
    for (let col = 0; col < GAME_RULES.COLS; col += 1) {
      board.push((row * 2 + col) % 5);
    }
  }
  return board;
}

test('un tablero recién creado no tiene líneas ya formadas', () => {
  for (let seed = 0; seed < 25; seed += 1) {
    const board = createBoard(new Rng(seed));
    assert.equal(findRuns(board).length, 0, `semilla ${seed}`);
  }
});

test('detecta líneas horizontales, verticales y de 4 o más', () => {
  const board = neutralBoard();
  assert.equal(findRuns(board).length, 0);

  board[indexOf(0, 0)] = 1;
  board[indexOf(0, 1)] = 1;
  board[indexOf(0, 2)] = 1;
  const horizontal = findRuns(board);
  assert.equal(horizontal.length, 1);
  assert.equal(horizontal[0]?.cells.length, 3);

  const vertical = neutralBoard();
  vertical[indexOf(2, 4)] = 3;
  vertical[indexOf(3, 4)] = 3;
  vertical[indexOf(4, 4)] = 3;
  vertical[indexOf(5, 4)] = 3;
  const runs = findRuns(vertical);
  assert.equal(runs.length, 1);
  assert.equal(runs[0]?.cells.length, 4);
});

test('el puntaje aplica bonos por longitud y multiplicador de cascada', () => {
  const run3 = [{ cells: [0, 1, 2], color: 0 }];
  const run4 = [{ cells: [0, 1, 2, 3], color: 0 }];
  const run5 = [{ cells: [0, 1, 2, 3, 4], color: 0 }];

  assert.equal(pointsForRuns(run3, 0), 3 * GAME_RULES.POINTS_PER_TILE);
  assert.equal(pointsForRuns(run4, 0), 4 * GAME_RULES.POINTS_PER_TILE + GAME_RULES.BONUS_MATCH_4);
  assert.equal(
    pointsForRuns(run5, 0),
    5 * GAME_RULES.POINTS_PER_TILE + GAME_RULES.BONUS_MATCH_5_PLUS,
  );

  // Segunda cascada: multiplicador 1.5
  assert.equal(pointsForRuns(run3, 1), Math.round(3 * GAME_RULES.POINTS_PER_TILE * 1.5));
  // Tope del multiplicador
  assert.equal(pointsForRuns(run3, 99), 3 * GAME_RULES.POINTS_PER_TILE * 3);
});

test('la celda compartida por dos líneas se elimina una sola vez', () => {
  const runs = [
    { cells: [10, 11, 12], color: 1 },
    { cells: [2, 10, 18], color: 1 },
  ];
  assert.equal(cellsClearedByRuns(runs).size, 5);
});

test('colapsar y rellenar deja el tablero completo', () => {
  const board = clearCells(neutralBoard(), [indexOf(7, 0), indexOf(6, 0), indexOf(0, 3)]);
  const refilled = collapseAndRefill(board, new Rng(7));

  assert.equal(refilled.length, TILE_COUNT);
  assert.ok(refilled.every((tile) => tile !== EMPTY && tile !== undefined));
});

test('un intercambio solo es legal si forma una línea', () => {
  const board = neutralBoard();
  // Preparamos: dos iguales en fila 0 y el tercero justo debajo del hueco.
  board[indexOf(0, 0)] = 1;
  board[indexOf(0, 1)] = 1;
  board[indexOf(1, 2)] = 1;
  board[indexOf(0, 2)] = 4;

  assert.equal(isLegalSwap(board, indexOf(0, 2), indexOf(1, 2)), true);
  // No adyacentes
  assert.equal(isLegalSwap(board, indexOf(0, 0), indexOf(5, 5)), false);
  // Adyacentes pero sin formar nada
  assert.equal(isLegalSwap(board, indexOf(5, 0), indexOf(5, 1)), false);
});

test('el motor rechaza movimientos ilegales sin tocar el estado', () => {
  const state = createGame(123);
  const illegal: Move = { a: 0, b: TILE_COUNT - 1 };
  const result = applyMove(state, illegal);

  assert.equal(result.ok, false);
  assert.equal(result.state, state);
  assert.equal(result.state.score, 0);
});

test('la partida es determinista: misma semilla y movimientos, mismo puntaje', () => {
  const seed = 4242;
  const moves = firstLegalMoves(seed, 5);

  const first = replayGame(seed, moves);
  const second = replayGame(seed, moves);

  assert.equal(first.valid, true);
  assert.equal(first.score, second.score);
  assert.deepEqual(first.colorCounts, second.colorCounts);
  assert.ok(first.score > 0);
});

test('la re-simulación rechaza un log de movimientos manipulado', () => {
  const seed = 99;
  const moves = firstLegalMoves(seed, 3);
  const tampered: Move[] = [...moves, { a: 0, b: 1 }, { a: 0, b: 1 }, { a: 0, b: 1 }];

  const replay = replayGame(seed, tampered);
  assert.equal(replay.valid, false);
  assert.notEqual(replay.rejectedAtMove, null);
});

test('rechaza más movimientos de los que caben en una partida', () => {
  const moves: Move[] = new Array(GAME_RULES.MAX_MOVES + 1).fill({ a: 0, b: 1 });
  assert.equal(replayGame(1, moves).valid, false);
});

test('el tamaño de la empresa respeta los umbrales', () => {
  assert.equal(companyFor(0, [1, 0, 0, 0, 0]).size, 'pequena');
  assert.equal(companyFor(GAME_RULES.SIZE_THRESHOLD_MEDIUM - 1, [1, 0, 0, 0, 0]).size, 'pequena');
  assert.equal(companyFor(GAME_RULES.SIZE_THRESHOLD_MEDIUM, [1, 0, 0, 0, 0]).size, 'mediana');
  assert.equal(companyFor(GAME_RULES.SIZE_THRESHOLD_LARGE - 1, [1, 0, 0, 0, 0]).size, 'mediana');
  assert.equal(companyFor(GAME_RULES.SIZE_THRESHOLD_LARGE, [1, 0, 0, 0, 0]).size, 'grande');
});

test('el rubro sale del color dominante y desempata de forma determinista', () => {
  assert.equal(dominantColorIndex([1, 9, 2, 0, 0]), 1);
  // Empate: gana el primero según el orden de TILE_COLORS (§2.4).
  assert.equal(dominantColorIndex([5, 5, 5, 0, 0]), 0);
  assert.equal(companyFor(100, [0, 0, 7, 0, 0]).type, 'Empresa Sustentable');
});

test('un tablero de un solo color siempre tiene movimientos', () => {
  assert.equal(hasAnyLegalSwap(boardOfColor(2)), true);
});

const REGISTRO_BASE = {
  name: 'Ana Prueba',
  email: 'ana@ejemplo.mx',
  consent: true as const,
};

test('la matrícula es obligatoria y debe empezar con A0', () => {
  const validas = ['A01234567', 'a01234567', ' a01234567 ', 'A0123456'];
  for (const matricula of validas) {
    const resultado = registerSchema.safeParse({ ...REGISTRO_BASE, matricula });
    assert.equal(resultado.success, true, `deberia aceptar ${matricula}`);
  }

  const invalidas = ['', 'B01234567', 'A1234567', '01234567', 'A0', 'A0abcdefg', 'A0123'];
  for (const matricula of invalidas) {
    const resultado = registerSchema.safeParse({ ...REGISTRO_BASE, matricula });
    assert.equal(resultado.success, false, `deberia rechazar ${matricula}`);
  }

  // Falta el campo por completo
  assert.equal(registerSchema.safeParse(REGISTRO_BASE).success, false);
});

test('la matrícula se guarda normalizada en mayúsculas', () => {
  const resultado = registerSchema.safeParse({ ...REGISTRO_BASE, matricula: 'a01234567' });
  assert.equal(resultado.success && resultado.data.matricula, 'A01234567');
});

/** Juega n movimientos legales buscando el primero disponible en cada turno. */
function firstLegalMoves(seed: number, count: number): Move[] {
  let state = createGame(seed);
  const moves: Move[] = [];

  while (moves.length < count) {
    const move = findAnyLegalMove(state.board);
    if (!move) break;
    moves.push(move);
    state = applyMove(state, move).state;
  }

  return moves;
}

function findAnyLegalMove(board: Board): Move | null {
  for (let row = 0; row < GAME_RULES.ROWS; row += 1) {
    for (let col = 0; col < GAME_RULES.COLS; col += 1) {
      const current = indexOf(row, col);
      const right = col + 1 < GAME_RULES.COLS ? indexOf(row, col + 1) : null;
      const down = row + 1 < GAME_RULES.ROWS ? indexOf(row + 1, col) : null;

      if (right !== null && isLegalSwap(board, current, right)) return { a: current, b: right };
      if (down !== null && isLegalSwap(board, current, down)) return { a: current, b: down };
    }
  }
  return null;
}
