/**
 * Constantes canónicas del juego — INSTRUCCIONES.md §2.3 a §2.5.
 * FUENTE ÚNICA DE VERDAD: cliente y servidor importan de aquí. Nunca duplicar
 * estos valores en otro archivo (code smell §5.1 y §5.2).
 */
export const GAME_RULES = {
  ROWS: 8,
  COLS: 8,
  MIN_MATCH: 3,

  DURATION_SECONDS: 60,
  /** Margen de red aceptado por el servidor al validar la duración (§4.1). */
  GRACE_SECONDS: 15,
  /** Techo de movimientos por partida; más que esto es imposible para un humano. */
  MAX_MOVES: 300,

  POINTS_PER_TILE: 10,
  BONUS_MATCH_4: 30,
  BONUS_MATCH_5_PLUS: 80,
  CASCADE_MULTIPLIERS: [1, 1.5, 2, 2.5, 3] as const,

  SIZE_THRESHOLD_MEDIUM: 1_500,
  SIZE_THRESHOLD_LARGE: 4_000,

  LEADERBOARD_SIZE: 5,

  PLAYER_NAME_MIN: 2,
  PLAYER_NAME_MAX: 40,
  COMPANY_NAME_MIN: 2,
  COMPANY_NAME_MAX: 30,
} as const;

export const TILE_COUNT = GAME_RULES.ROWS * GAME_RULES.COLS;

export type CompanySize = 'pequena' | 'mediana' | 'grande';

export const COMPANY_SIZE_LABEL: Record<CompanySize, string> = {
  pequena: 'Pequeña empresa',
  mediana: 'Mediana empresa',
  grande: 'Gran empresa',
};

/**
 * Los cinco colores. El ORDEN de este arreglo es el índice de color usado por el
 * motor y es también el criterio final de desempate del rubro (§2.4).
 */
export const TILE_COLORS = [
  {
    id: 'clientes',
    label: 'Clientes',
    company: 'Empresa Comercial / Retail',
    description: 'Sabes a quién le sirve lo que haces y cómo llegar a esa gente.',
    icon: '👥',
    className: 'tile-clientes',
  },
  {
    id: 'ideas',
    label: 'Ideas',
    company: 'Empresa de Tecnología e Innovación',
    description: 'Conviertes problemas en soluciones que nadie había armado así.',
    icon: '💡',
    className: 'tile-ideas',
  },
  {
    id: 'recursos',
    label: 'Recursos',
    company: 'Empresa Sustentable',
    description: 'Haces mucho con poco y cuidas de dónde sale cada insumo.',
    icon: '🌱',
    className: 'tile-recursos',
  },
  {
    id: 'talento',
    label: 'Talento',
    company: 'Empresa Educativa / Consultoría',
    description: 'Tu fuerte es la gente: formarla, coordinarla y potenciarla.',
    icon: '🎓',
    className: 'tile-talento',
  },
  {
    id: 'pasion',
    label: 'Pasión',
    company: 'Empresa Social / Comunitaria',
    description: 'Emprendes por una causa y arrastras a otros contigo.',
    icon: '❤️',
    className: 'tile-pasion',
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
