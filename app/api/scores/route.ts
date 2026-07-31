/**
 * Cierre de partida y guardado del puntaje — INSTRUCCIONES.md §4.1.
 *
 * Regla central: el puntaje que manda el navegador NO se usa. El servidor
 * re-simula la partida con la semilla que él mismo generó y el log de
 * movimientos, y guarda su propio resultado.
 */
import { NextResponse } from 'next/server';
import { companyFor } from '@/lib/game/company';
import { replayGame } from '@/lib/game/engine';
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
import { firstIssueMessage, submitScoreSchema } from '@/lib/server/validation';

const LIMIT_PER_HOUR = 20;
const ONE_HOUR_SECONDS = 60 * 60;
const REJECTED_MESSAGE = 'No pudimos validar esta partida. Vuelve a jugar.';

export async function POST(request: Request) {
  const playerId = await currentPlayerId();
  if (!playerId) return jsonError(UNAUTHORIZED_MESSAGE, 401);

  const limit = checkRateLimit(`scores:${playerId}`, LIMIT_PER_HOUR, ONE_HOUR_SECONDS);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Datos inválidos.', 400);
  }

  const parsed = submitScoreSchema.safeParse(body);
  if (!parsed.success) return jsonError(firstIssueMessage(parsed.error), 400);

  const { sessionId, companyName, moves } = parsed.data;

  try {
    const store = await getStore();
    const session = await store.findGameSession(sessionId);

    // La sesión debe existir, ser de este jugador y no haberse usado antes.
    if (!session || session.playerId !== playerId) {
      logServerError(
        'scores.POST.rechazo',
        new Error(session ? 'la sesion es de otro jugador' : 'sesion inexistente'),
      );
      return jsonError(REJECTED_MESSAGE, 403);
    }
    if (session.status !== 'open') return jsonError('Esta partida ya se guardó.', 409);

    // Sin límite de tiempo para enviar: la persona nombra su empresa con
    // calma. Lo que acota el abuso es la re-simulación y el techo de
    // movimientos, no el reloj (§4.1).
    const replay = replayGame(session.seed, moves);
    if (!replay.valid) {
      await store.closeGameSession(session.id, 'rejected');
      return jsonError(REJECTED_MESSAGE, 422);
    }

    const company = companyFor(replay.score, replay.colorCounts);
    await store.saveScore({
      sessionId: session.id,
      playerId,
      score: replay.score,
      companyName,
      companySize: company.size,
      companyType: company.type,
      colorCounts: replay.colorCounts,
    });
    await store.closeGameSession(session.id, 'closed');

    const [leaderboard, standing, usados] = await Promise.all([
      store.topScores(GAME_RULES.LEADERBOARD_SIZE),
      store.standingFor(playerId),
      store.countGameSessions(playerId),
    ]);

    return NextResponse.json({
      score: replay.score,
      colorCounts: replay.colorCounts,
      company,
      leaderboard,
      standing,
      intentos: intentosDe(usados),
      madeTopFive: (standing?.rank ?? Number.MAX_SAFE_INTEGER) <= GAME_RULES.LEADERBOARD_SIZE,
    });
  } catch (error) {
    logServerError('scores.POST', error);
    return jsonError(GENERIC_ERROR_MESSAGE, 500);
  }
}
