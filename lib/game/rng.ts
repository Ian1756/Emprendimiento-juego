/**
 * PRNG determinista (mulberry32). El tablero y los rellenos salen de aquí y no
 * de Math.random(), para que el servidor pueda re-simular la partida con la
 * misma semilla y verificar el puntaje — INSTRUCCIONES.md §4.1.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // >>> 0 mantiene el estado como uint32 aunque llegue un seed negativo.
    this.state = seed >>> 0;
  }

  /** Número flotante en [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  }

  /** Entero en [0, max). */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  /** Copia con el mismo estado, para que el motor pueda ser puro (§3). */
  clone(): Rng {
    return new Rng(this.state);
  }
}
