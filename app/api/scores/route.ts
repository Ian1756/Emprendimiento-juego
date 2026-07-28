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
const MAX_DURATION_MS = (GAME_RULES.DURATION_SECONDS + GAME_RULES.GRACE_SECONDS) * 1000;
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
    if (!session || session.playerId !== playerId) return jsonError(REJECTED_MESSAGE, 403);
    if (session.status !== 'open') return jsonError('Esta partida ya se guardó.', 409);

    const elapsedMs = Date.now() - Date.parse(session.startedAt);
    if (elapsedMs > MAX_DURATION_MS) {
      await store.closeGameSession(session.id, 'rejected');
      return jsonError('Se acabó el tiempo para guardar esta partida.', 422);
    }

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

    const [leaderboard, standing] = await Promise.all([
      store.topScores(GAME_RULES.LEADERBOARD_SIZE),
      store.standingFor(playerId),
    ]);

    return NextResponse.json({
      score: replay.score,
      colorCounts: replay.colorCounts,
      company,
      leaderboard,
      standing,
      madeTopFive: (standing?.rank ?? Number.MAX_SAFE_INTEGER) <= GAME_RULES.LEADERBOARD_SIZE,
    });
  } catch (error) {
    logServerError('scores.POST', error);
    return jsonError(GENERIC_ERROR_MESSAGE, 500);
  }
}
