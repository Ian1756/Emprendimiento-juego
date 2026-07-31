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

/**
 * Límite por IP alto a propósito — INSTRUCCIONES.md §4.3.
 *
 * En un evento presencial TODA la sala sale por la misma IP pública del WiFi
 * del campus. Un límite bajo aquí no frena a un atacante (le basta cambiar de
 * red) pero sí deja fuera a la fila entera de asistentes: con 5/hora la sexta
 * persona ya no podía jugar, y con 400/hora se quedaban fuera 600 de 1000
 * (medido). Este número es un freno contra inundación, no una defensa: lo que
 * de verdad acota el abuso es el tope de 2 partidas por jugador, que va por
 * cuenta y no por IP.
 */
const LIMIT_PER_HOUR = 2_000;
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
