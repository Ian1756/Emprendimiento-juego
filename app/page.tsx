/**
 * Entrada del juego (la URL del QR) — INSTRUCCIONES.md §2.
 * Componente de servidor: decide registro vs inicio leyendo la cookie de sesión
 * y precarga el Top 5 para que la primera pantalla no parpadee.
 */
import Juego from '@/components/Juego';
import { GAME_RULES } from '@/lib/game/rules';
import { currentPlayerId } from '@/lib/server/session';
import { getStore } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const store = await getStore();
  const playerId = await currentPlayerId();
  const player = playerId ? await store.findPlayerById(playerId) : null;

  const [entries, standing] = await Promise.all([
    store.topScores(GAME_RULES.LEADERBOARD_SIZE),
    player ? store.standingFor(player.id) : Promise.resolve(null),
  ]);

  // Al cliente solo le llega el nombre público: el correo nunca sale (§4.5).
  return <Juego playerName={player?.displayName ?? null} entries={entries} standing={standing} />;
}
