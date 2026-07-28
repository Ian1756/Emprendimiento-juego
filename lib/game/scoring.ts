/**
 * Puntaje — INSTRUCCIONES.md §2.3. Funciones puras sobre las líneas formadas.
 *
 * Nota de diseño: cuando una línea horizontal y una vertical se cruzan, la
 * celda compartida se elimina una sola vez pero puntúa en ambas líneas. Es
 * intencional (premia la jugada en cruz) y es determinista, así que el servidor
 * llega exactamente al mismo número al re-simular.
 */
import type { Run } from './board';
import {
  bonusForRunLength,
  cascadeMultiplier,
  emptyColorCounts,
  GAME_RULES,
  type ColorCounts,
} from './rules';

export function pointsForRuns(runs: Run[], cascadeIndex: number): number {
  const base = runs.reduce(
    (total, run) => total + run.cells.length * GAME_RULES.POINTS_PER_TILE + bonusForRunLength(run.cells.length),
    0,
  );
  return Math.round(base * cascadeMultiplier(cascadeIndex));
}

/** Celdas únicas que desaparecen (la intersección de dos líneas cuenta una vez). */
export function cellsClearedByRuns(runs: Run[]): Set<number> {
  const cleared = new Set<number>();
  for (const run of runs) {
    for (const cell of run.cells) cleared.add(cell);
  }
  return cleared;
}

/** Conteo por color de las celdas realmente eliminadas: define el rubro (§2.4). */
export function colorCountsForRuns(runs: Run[], clearedCells: Set<number>): ColorCounts {
  const counts = emptyColorCounts();
  const alreadyCounted = new Set<number>();

  for (const run of runs) {
    for (const cell of run.cells) {
      if (!clearedCells.has(cell) || alreadyCounted.has(cell)) continue;
      alreadyCounted.add(cell);
      counts[run.color] = (counts[run.color] ?? 0) + 1;
    }
  }

  return counts;
}

export function addColorCounts(target: ColorCounts, addition: ColorCounts): ColorCounts {
  return target.map((value, index) => value + (addition[index] ?? 0));
}
