/**
 * Entrada del juego (la URL del QR) — INSTRUCCIONES.md §2.
 * Componente de servidor: decide registro vs inicio leyendo la cookie de sesión
 * y precarga el Top 5 para que la primera pantalla no parpadee.
 */
import Juego from '@/components/Juego';
import { GAME_RULES } from '@/lib/game/rules';
import { logServerError } from '@/lib/server/http';
import { currentPlayerId } from '@/lib/server/session';
import { getStore } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

/**
 * Carga inicial tolerante a fallos: si la base no responde, la pantalla debe
 * abrir igual (con el tablero vacío) en vez de tumbar toda la página. El error
 * se ve al intentar registrarse o guardar, con un mensaje claro (§4.9).
 */
async function cargarDatosIniciales() {
  try {
    const store = await getStore();
    const playerId = await currentPlayerId();
    const player = playerId ? await store.findPlayerById(playerId) : null;

    const [entries, standing] = await Promise.all([
      store.topScores(GAME_RULES.LEADERBOARD_SIZE),
      player ? store.standingFor(player.id) : Promise.resolve(null),
    ]);

    return { playerName: player?.displayName ?? null, entries, standing };
  } catch (error) {
    logServerError('page.inicial', error);
    return { playerName: null, entries: [], standing: null };
  }
}

export default async function Page() {
  // Al cliente solo le llega el nombre público: el correo nunca sale (§4.5).
  const { playerName, entries, standing } = await cargarDatosIniciales();
  return <Juego playerName={playerName} entries={entries} standing={standing} />;
}
