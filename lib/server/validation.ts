/**
 * Validación y saneado de entradas — INSTRUCCIONES.md §4.7.
 * TODA petición pasa por aquí en el servidor; validar en el cliente es solo UX.
 */
import { z } from 'zod';
import { GAME_RULES, TILE_COUNT } from '@/lib/game/rules';

/** Caracteres de control + invisibles usados para colar texto raro en el leaderboard. */
const INVISIBLE_CHARS = new RegExp(
  '[\\u0000-\\u001F\\u007F-\\u009F\\u200B-\\u200F\\u2028\\u2029\\u202A-\\u202E\\uFEFF]',
  'g',
);

export function cleanText(value: string): string {
  return value.replace(INVISIBLE_CHARS, ' ').replace(/\s+/g, ' ').trim();
}

const BANNED_PATTERNS = [
  /https?:\/\//i,
  /www\./i,
  /<[^>]*>/,
  /\b(put[oa]s?|pend[eé]j[oa]s?|verga|chinga|ching[oa]|mierda|pinche|culer[oa]|maric[oó]n|zorra|perra)\b/i,
];

function hasBannedContent(value: string): boolean {
  return BANNED_PATTERNS.some((pattern) => pattern.test(value));
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
