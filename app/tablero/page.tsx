/**
 * Pantalla pública del leaderboard para proyectar en el evento.
 * Accesible en /tablero y, si se configura, en un subdominio propio (§2.7).
 */
import TableroEnVivo from '@/components/TableroEnVivo';
import { GAME_RULES } from '@/lib/game/rules';
import { logServerError } from '@/lib/server/http';
import { getStore } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tablero en vivo | Reto Emprendedor',
  // No queremos esta pantalla en buscadores: es para una pantalla del evento.
  robots: { index: false, follow: false },
};

export default async function Page() {
  let entradas = await cargarTop();
  if (!entradas) entradas = [];

  return <TableroEnVivo entradasIniciales={entradas} />;
}

async function cargarTop() {
  try {
    const store = await getStore();
    return await store.topScores(GAME_RULES.LEADERBOARD_SIZE);
  } catch (error) {
    // Igual que la portada: si la base falla, la pantalla abre vacía y el
    // refresco automático se encarga cuando vuelva (§4.9).
    logServerError('tablero.inicial', error);
    return null;
  }
}
