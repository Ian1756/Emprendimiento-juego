/**
 * Apertura de partida — INSTRUCCIONES.md §4.1.
 * El servidor genera la semilla y guarda la hora de inicio; el cliente solo
 * recibe el id de sesión y la semilla con la que construye el mismo tablero.
 */
import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { intentosDe } from '@/lib/game/intentos';
import { GAME_RULES } from '@/lib/game/rules';
import {
  GENERIC_ERROR_MESSAGE,
  jsonError,
  logServerError,
  tooManyRequests,
  UNAUTHORIZED_MESSAGE,
} from '@/lib/server/http';
import { checkRateLimit } from '@/lib/server/rateLimit';
import { currentPlayerId } from '@/lib/server/session';
import { getStore } from '@/lib/server/store';

const LIMIT_PER_HOUR = 20;
const ONE_HOUR_SECONDS = 60 * 60;
const MAX_SEED = 2 ** 31;

export async function POST() {
  const playerId = await currentPlayerId();
  if (!playerId) return jsonError(UNAUTHORIZED_MESSAGE, 401);

  const limit = checkRateLimit(`sessions:${playerId}`, LIMIT_PER_HOUR, ONE_HOUR_SECONDS);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const store = await getStore();
    if (!(await store.findPlayerById(playerId))) return jsonError(UNAUTHORIZED_MESSAGE, 401);

    // El tope de partidas se aplica AQUÍ, no en el navegador (§4.1).
    const usados = await store.countGameSessions(playerId);
    if (usados >= GAME_RULES.MAX_INTENTOS) {
      return jsonError('Ya usaste tus dos partidas. ¡Gracias por jugar!', 403);
    }

    const session = await store.createGameSession({ playerId, seed: randomInt(MAX_SEED) });
    return NextResponse.json({
      sessionId: session.id,
      seed: session.seed,
      intentos: intentosDe(usados + 1),
    });
  } catch (error) {
    logServerError('sessions.POST', error);
    return jsonError(GENERIC_ERROR_MESSAGE, 500);
  }
}
