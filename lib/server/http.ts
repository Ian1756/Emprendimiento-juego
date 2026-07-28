/**
 * Respuestas de API. Al usuario le llega un mensaje genérico; el detalle
 * técnico se queda en el log del servidor — INSTRUCCIONES.md §4.9.
 */
import 'server-only';
import { NextResponse } from 'next/server';

export function jsonError(message: string, status: number, extraHeaders?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers: extraHeaders });
}

export function tooManyRequests(retryAfterSeconds: number) {
  return jsonError('Vas muy rápido. Espera un momento e intenta de nuevo.', 429, {
    'Retry-After': String(retryAfterSeconds),
  });
}

export const UNAUTHORIZED_MESSAGE = 'Tu sesión no es válida. Vuelve a entrar al juego.';
export const GENERIC_ERROR_MESSAGE = 'Algo salió mal. Intenta de nuevo.';

/** Log sin datos personales ni tokens (§4.9). */
export function logServerError(scope: string, error: unknown): void {
  const detail = error instanceof Error ? error.message : 'error desconocido';
  console.error(`[${scope}] ${detail}`);
}
