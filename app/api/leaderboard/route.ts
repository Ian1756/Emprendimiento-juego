/** Top 5 público — INSTRUCCIONES.md §2.2. Solo lectura, sin datos personales. */
import { NextResponse } from 'next/server';
import { GAME_RULES } from '@/lib/game/rules';
import { GENERIC_ERROR_MESSAGE, jsonError, logServerError, tooManyRequests } from '@/lib/server/http';
import { checkRateLimit, clientIp } from '@/lib/server/rateLimit';
import { currentPlayerId } from '@/lib/server/session';
import { getStore } from '@/lib/server/store';

const LIMIT_PER_MINUTE = 60;
const ONE_MINUTE_SECONDS = 60;

export async function GET(request: Request) {
  const limit = checkRateLimit(`leaderboard:${clientIp(request)}`, LIMIT_PER_MINUTE, ONE_MINUTE_SECONDS);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const store = await getStore();
    const playerId = await currentPlayerId();

    const [entries, standing] = await Promise.all([
      store.topScores(GAME_RULES.LEADERBOARD_SIZE),
      playerId ? store.standingFor(playerId) : Promise.resolve(null),
    ]);

    return NextResponse.json(
      { entries, standing },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    logServerError('leaderboard.GET', error);
    return jsonError(GENERIC_ERROR_MESSAGE, 500);
  }
}
