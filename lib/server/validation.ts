/**
 * Validación y saneado de entradas — INSTRUCCIONES.md §4.7.
 * TODA petición pasa por aquí en el servidor; validar en el cliente es solo UX.
 */
import { z } from 'zod';
import { GAME_RULES, TILE_COUNT } from '@/lib/game/rules';
import { FRASES_PROHIBIDAS, PALABRAS_PROHIBIDAS } from './palabrasProhibidas';

/** Caracteres de control + invisibles usados para colar texto raro en el leaderboard. */
const INVISIBLE_CHARS = new RegExp(
  '[\\u0000-\\u001F\\u007F-\\u009F\\u200B-\\u200F\\u2028\\u2029\\u202A-\\u202E\\uFEFF]',
  'g',
);

export function cleanText(value: string): string {
  return value.replace(INVISIBLE_CHARS, ' ').replace(/\s+/g, ' ').trim();
}

const BANNED_PATTERNS = [/https?:\/\//i, /www\./i, /<[^>]*>/];

/** Sustituciones típicas para disfrazar una palabra: p4to, pu70, m1erda. */
const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  $: 's',
  '!': 'i',
};

/** Minúsculas y sin acentos. No toca los números todavía. */
function sinAcentos(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Un token puramente numérico NUNCA se decodifica.
 *
 * Si no, "455" se convertía en "ass" y "717" en "tit", y quedaban bloqueados
 * nombres perfectamente normales como "Asistente 455" o "Grupo 717" (falso
 * positivo real, encontrado en pruebas el 2026-07-31). El leet solo tiene
 * sentido cuando alguien mezcla números con letras para disfrazar una palabra.
 */
function decodificarToken(token: string): string {
  if (/^[\d@$!]+$/.test(token)) return token;
  return token.replace(/[01345789@$!]/g, (c) => LEET[c] ?? c).replace(/(.)\1{2,}/g, '$1');
}

/** Separa también camelCase: "PutoElQueLoLea" no debe pasar por ir pegado. */
function tokenizar(value: string): string[] {
  const separado = value.replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2');
  return sinAcentos(separado)
    .split(/[^a-z0-9@$!]+/)
    .filter(Boolean)
    .map(decodificarToken);
}

/** Quita el plural simple para que "putos" caiga con "puto" en la lista. */
function esProhibida(token: string): boolean {
  if (PALABRAS_PROHIBIDAS.has(token)) return true;
  if (token.endsWith('es') && PALABRAS_PROHIBIDAS.has(token.slice(0, -2))) return true;
  if (token.endsWith('s') && PALABRAS_PROHIBIDAS.has(token.slice(0, -1))) return true;
  return false;
}

/**
 * La comparación es por PALABRA COMPLETA a propósito. Buscar subcadenas
 * bloquearía nombres legítimos: "Cassandra" contiene "ass", "computadora" y
 * "disputas" contienen "puta", "cálculo" contiene "culo", "análisis" contiene
 * "anal" y "Titán" contiene "tit".
 */
function hasBannedContent(value: string): boolean {
  if (BANNED_PATTERNS.some((pattern) => pattern.test(value))) return true;

  const tokens = tokenizar(value);
  if (tokens.some(esProhibida)) return true;

  const normalizado = tokens.join(' ');
  if ([...FRASES_PROHIBIDAS].some((frase) => normalizado.includes(frase))) return true;

  // Evasión letra por letra: "p u t o", "p.u.t.o". Solo se aplica cuando el
  // texto son puras letras sueltas, para no volver a caer en subcadenas.
  if (tokens.length >= 3 && tokens.every((token) => token.length === 1)) {
    const compacto = tokens.join('');
    return [...PALABRAS_PROHIBIDAS].some(
      (palabra) => palabra.length >= 3 && compacto.includes(palabra),
    );
  }

  return false;
}

function nameSchema(min: number, max: number, label: string) {
  return z
    .string()
    .transform(cleanText)
    .pipe(
      z
        .string()
        .min(min, `${label} debe tener al menos ${min} caracteres.`)
        .max(max, `${label} no puede pasar de ${max} caracteres.`)
        .refine((value) => !hasBannedContent(value), {
          message: 'Usa un texto apropiado: se muestra en pantalla para todos.',
        }),
    );
}

/**
 * Matrícula del Tec: empieza con A0 seguido de dígitos (ej. A01234567).
 * Se guarda normalizada en mayúsculas para que A0… y a0… no creen variantes.
 */
const MATRICULA = /^A0\d{5,9}$/;

const matriculaSchema = z
  .string()
  .transform((value) => cleanText(value).toUpperCase().replace(/\s/g, ''))
  .pipe(
    z.string().regex(MATRICULA, 'Tu matrícula debe empezar con A0 (ejemplo: A01234567).'),
  );

export const registerSchema = z.object({
  name: nameSchema(GAME_RULES.PLAYER_NAME_MIN, GAME_RULES.PLAYER_NAME_MAX, 'Tu nombre'),
  matricula: matriculaSchema,
  email: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .pipe(z.string().email('Escribe un correo válido.').max(254)),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Necesitamos tu consentimiento para guardar tus datos.' }),
  }),
});

const cellSchema = z.number().int().min(0).max(TILE_COUNT - 1);

export const submitScoreSchema = z.object({
  sessionId: z.string().uuid(),
  companyName: nameSchema(
    GAME_RULES.COMPANY_NAME_MIN,
    GAME_RULES.COMPANY_NAME_MAX,
    'El nombre de tu empresa',
  ),
  moves: z
    .array(z.object({ a: cellSchema, b: cellSchema }))
    .max(GAME_RULES.MAX_MOVES, 'Demasiados movimientos.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type SubmitScoreInput = z.infer<typeof submitScoreSchema>;

/** Primer mensaje de error legible, sin filtrar la estructura interna. */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Revisa los datos e intenta de nuevo.';
}
