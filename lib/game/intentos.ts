/**
 * Intentos por jugador — INSTRUCCIONES.md §2.8.
 *
 * Se cuenta al ABRIR la partida, no al guardarla: si contáramos solo las
 * guardadas, cualquiera podría jugar, ver un puntaje bajo, no guardarlo y
 * volver a empezar indefinidamente.
 */
import { GAME_RULES } from './rules';

export interface Intentos {
  usados: number;
  restantes: number;
  maximo: number;
}

export function intentosDe(usados: number): Intentos {
  const acotado = Math.min(Math.max(usados, 0), GAME_RULES.MAX_INTENTOS);
  return {
    usados: acotado,
    restantes: GAME_RULES.MAX_INTENTOS - acotado,
    maximo: GAME_RULES.MAX_INTENTOS,
  };
}

/** Texto que se le muestra al jugador según lo que le quede. */
export function mensajeDeIntentos(intentos: Intentos): string {
  if (intentos.restantes === 0) return 'Fue tu última partida. Tu mejor puntaje quedó guardado.';
  if (intentos.restantes === 1) return 'Te queda una oportunidad más. Se guarda tu puntaje más alto.';
  return `Tienes ${intentos.restantes} partidas.`;
}
