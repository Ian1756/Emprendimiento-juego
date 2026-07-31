/**
 * Constantes canónicas del juego — INSTRUCCIONES.md §2.3 a §2.5.
 * FUENTE ÚNICA DE VERDAD: cliente y servidor importan de aquí. Nunca duplicar
 * estos valores en otro archivo (code smell §5.1 y §5.2).
 */
export const GAME_RULES = {
  ROWS: 8,
  COLS: 8,
  MIN_MATCH: 3,

  DURATION_SECONDS: 90,
  /**
   * No hay plazo para enviar el puntaje: la persona se toma el tiempo que
   * quiera nombrando su empresa (§4.1). El reloj nunca protegió de nada —un
   * cliente manipulado envía cuando quiere—, así que lo único que hacía un
   * plazo corto era quitarle la partida a quien se tardaba pensando.
   *
   * Techo de movimientos por partida. Cada movimiento consume al menos ~0.42 s
   * de animación, así que en 90 s nadie pasa de ~215. 250 deja margen para un
   * jugador rapidísimo y aun así acota lo que podría enviar un cliente
   * manipulado: es la defensa que sí sirve.
   */
  MAX_MOVES: 250,

  POINTS_PER_TILE: 10,
  BONUS_MATCH_4: 30,
  BONUS_MATCH_5_PLUS: 80,
  CASCADE_MULTIPLIERS: [1, 1.5, 2, 2.5, 3] as const,

  SIZE_THRESHOLD_MEDIUM: 2_000,
  SIZE_THRESHOLD_LARGE: 3_300,
  SIZE_THRESHOLD_UNICORN: 6_000,

  LEADERBOARD_SIZE: 5,
  /** Partidas por persona. Se cuenta al ABRIR la partida, no al guardarla. */
  MAX_INTENTOS: 2,

  PLAYER_NAME_MIN: 2,
  PLAYER_NAME_MAX: 40,
  COMPANY_NAME_MIN: 2,
  COMPANY_NAME_MAX: 30,
} as const;

export const TILE_COUNT = GAME_RULES.ROWS * GAME_RULES.COLS;

export type CompanySize = 'pequena' | 'mediana' | 'grande' | 'unicornio';

export const COMPANY_SIZE_LABEL: Record<CompanySize, string> = {
  pequena: 'Pequeña empresa',
  mediana: 'Mediana empresa',
  grande: 'Gran empresa',
  unicornio: 'Unicornio 🦄',
};

/** Artículo que acompaña a cada etiqueta: "construiste **una** pequeña empresa". */
export const COMPANY_SIZE_ARTICLE: Record<CompanySize, string> = {
  pequena: 'una',
  mediana: 'una',
  grande: 'una',
  unicornio: 'un',
};

/**
 * Los cinco colores. El ORDEN de este arreglo es el índice de color usado por el
 * motor y es también el criterio final de desempate del rubro (§2.4).
 *
 * `ink` es el color del icono sobre la ficha: oscuro sobre los tonos claros
 * (ideas, recursos) y claro sobre los oscuros, para que siempre contraste.
 */
export const TILE_COLORS = [
  {
    id: 'clientes',
    label: 'Clientes',
    company: 'Empresa Comercial / Retail',
    description: 'Sabes a quién le sirve lo que haces y cómo llegar a esa gente.',
    className: 'tile-clientes',
    ink: 'clara',
  },
  {
    id: 'ideas',
    label: 'Ideas',
    company: 'Empresa de Tecnología e Innovación',
    description: 'Conviertes problemas en soluciones que nadie había armado así.',
    className: 'tile-ideas',
    ink: 'oscura',
  },
  {
    id: 'recursos',
    label: 'Recursos',
    company: 'Empresa Sustentable',
    description: 'Haces mucho con poco y cuidas de dónde sale cada insumo.',
    className: 'tile-recursos',
    ink: 'oscura',
  },
  {
    id: 'talento',
    label: 'Talento',
    company: 'Empresa Educativa / Consultoría',
    description: 'Tu fuerte es la gente: formarla, coordinarla y potenciarla.',
    className: 'tile-talento',
    ink: 'clara',
  },
  {
    id: 'pasion',
    label: 'Pasión',
    company: 'Empresa Social / Comunitaria',
    description: 'Emprendes por una causa y arrastras a otros contigo.',
    className: 'tile-pasion',
    ink: 'clara',
  },
] as const;

export const COLOR_COUNT = TILE_COLORS.length;

export type ColorIndex = number;
/** Conteo de fichas eliminadas por color, indexado igual que TILE_COLORS. */
export type ColorCounts = number[];

export function emptyColorCounts(): ColorCounts {
  return new Array<number>(COLOR_COUNT).fill(0);
}

export function bonusForRunLength(length: number): number {
  if (length >= 5) return GAME_RULES.BONUS_MATCH_5_PLUS;
  if (length === 4) return GAME_RULES.BONUS_MATCH_4;
  return 0;
}

export function cascadeMultiplier(cascadeIndex: number): number {
  const multipliers = GAME_RULES.CASCADE_MULTIPLIERS;
  const last = multipliers[multipliers.length - 1] ?? 1;
  return multipliers[Math.min(cascadeIndex, multipliers.length - 1)] ?? last;
}

export function companySizeForScore(score: number): CompanySize {
  if (score >= GAME_RULES.SIZE_THRESHOLD_UNICORN) return 'unicornio';
  if (score >= GAME_RULES.SIZE_THRESHOLD_LARGE) return 'grande';
  if (score >= GAME_RULES.SIZE_THRESHOLD_MEDIUM) return 'mediana';
  return 'pequena';
}

/**
 * Rubro = color con más fichas eliminadas. Desempate DETERMINISTA por el orden
 * de TILE_COLORS (§2.4): nunca aleatorio, para que el servidor y el cliente
 * lleguen siempre al mismo resultado.
 */
export function dominantColorIndex(counts: ColorCounts): ColorIndex {
  let best = 0;
  for (let i = 1; i < COLOR_COUNT; i += 1) {
    if ((counts[i] ?? 0) > (counts[best] ?? 0)) best = i;
  }
  return best;
}
