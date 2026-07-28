/**
 * Sesión del jugador — INSTRUCCIONES.md §4.2.
 * Cookie firmada con HMAC, HttpOnly. El playerId SIEMPRE se lee de aquí y jamás
 * del body de una petición.
 */
import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { serverEnv } from './env';

export const SESSION_COOKIE = 'jugador';
const SESSION_DAYS = 90;
const SESSION_MAX_AGE_SECONDS = SESSION_DAYS * 24 * 60 * 60;

function sign(payload: string): string {
  return createHmac('sha256', serverEnv.sessionSecret).update(payload).digest('base64url');
}

function signaturesMatch(expected: string, received: string): boolean {
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  if (expectedBytes.length !== receivedBytes.length) return false;
  return timingSafeEqual(expectedBytes, receivedBytes);
}

export function createSessionToken(playerId: string, nowMs: number): string {
  const expiresAt = nowMs + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${playerId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string, nowMs: number): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [playerId, expiresAtRaw, signature] = parts as [string, string, string];
  const payload = `${playerId}.${expiresAtRaw}`;
  if (!signaturesMatch(sign(payload), signature)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < nowMs) return null;

  return playerId;
}

export async function setSessionCookie(playerId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(playerId, Date.now()), {
    httpOnly: true,
    secure: serverEnv.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Devuelve el playerId autenticado o null. Única fuente de identidad. */
export async function currentPlayerId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token, Date.now());
}
