/**
 * Alta del jugador — INSTRUCCIONES.md §2.1, §4.5, §4.6.
 * Responde igual exista o no el correo: no se puede enumerar quién ya jugó.
 */
import { NextResponse } from 'next/server';
import { GENERIC_ERROR_MESSAGE, jsonError, logServerError, tooManyRequests } from '@/lib/server/http';
import { checkRateLimit, clientIp } from '@/lib/server/rateLimit';
import { setSessionCookie } from '@/lib/server/session';
import { getStore } from '@/lib/server/store';
import { firstIssueMessage, registerSchema } from '@/lib/server/validation';

const LIMIT_PER_HOUR = 5;
const ONE_HOUR_SECONDS = 60 * 60;

export async function POST(request: Request) {
  const limit = checkRateLimit(`players:${clientIp(request)}`, LIMIT_PER_HOUR, ONE_HOUR_SECONDS);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Datos inválidos.', 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return jsonError(firstIssueMessage(parsed.error), 400);

  try {
    const store = await getStore();
    const { name, email, matricula } = parsed.data;

    // Si ya existe, se reutiliza: no se duplica el jugador y no se cambia el
    // nombre visible (conocer un correo ajeno no debe permitir renombrarlo).
    const existing = await store.findPlayerByEmail(email);
    const player =
      existing ?? (await store.createPlayer({ displayName: name, email, matricula }));

    await setSessionCookie(player.id);
    return NextResponse.json({ ok: true, playerName: player.displayName });
  } catch (error) {
    logServerError('players.POST', error);
    return jsonError(GENERIC_ERROR_MESSAGE, 500);
  }
}
