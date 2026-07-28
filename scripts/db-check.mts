/**
 * Prueba el adaptador de Postgres contra la base real: crea un jugador de
 * prueba, juega una partida simulada, la guarda, consulta el leaderboard y
 * borra todo lo que creó.
 *
 * Uso: npm run db:check
 */
import { companyFor } from '../lib/game/company';
import { applyMove, createGame, replayGame, type Move } from '../lib/game/engine';
import { indexOf, isLegalSwap, type Board } from '../lib/game/board';
import { GAME_RULES } from '../lib/game/rules';
import { postgresStore } from '../lib/server/store/postgresStore';
import { createPool, describeConnection } from '../lib/server/store/pool';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Falta DATABASE_URL. Ponla en .env.local.');
  process.exit(1);
}

const EMAIL_PRUEBA = `prueba-automatica-${Date.now()}@ejemplo.invalid`;
const pool = createPool(connectionString);
let creadoPlayerId: string | null = null;

function jugadaLegal(board: Board): Move | null {
  for (let row = 0; row < GAME_RULES.ROWS; row += 1) {
    for (let col = 0; col < GAME_RULES.COLS; col += 1) {
      const aqui = indexOf(row, col);
      if (col + 1 < GAME_RULES.COLS && isLegalSwap(board, aqui, indexOf(row, col + 1))) {
        return { a: aqui, b: indexOf(row, col + 1) };
      }
      if (row + 1 < GAME_RULES.ROWS && isLegalSwap(board, aqui, indexOf(row + 1, col))) {
        return { a: aqui, b: indexOf(row + 1, col) };
      }
    }
  }
  return null;
}

function verificar(condicion: boolean, mensaje: string): void {
  console.log(`${condicion ? '  ✓' : '  ✗'} ${mensaje}`);
  if (!condicion) process.exitCode = 1;
}

try {
  console.log(`Probando ${describeConnection(connectionString)}…`);

  // 1. Alta de jugador
  const jugador = await postgresStore.createPlayer({
    displayName: 'Prueba Automatica',
    email: EMAIL_PRUEBA,
  });
  creadoPlayerId = jugador.id;
  verificar(Boolean(jugador.id), 'crea jugador');

  const encontrado = await postgresStore.findPlayerByEmail(EMAIL_PRUEBA);
  verificar(encontrado?.id === jugador.id, 'lo encuentra por correo');
  verificar(
    (await postgresStore.findPlayerByEmail(EMAIL_PRUEBA.toUpperCase()))?.id === jugador.id,
    'el correo no distingue mayúsculas',
  );

  // 2. Partida
  const partida = await postgresStore.createGameSession({ playerId: jugador.id, seed: 987_654 });
  verificar(partida.status === 'open', 'abre partida con estado open');
  verificar(partida.seed === 987_654, 'guarda y devuelve la semilla intacta');

  let estado = createGame(partida.seed);
  const movimientos: Move[] = [];
  for (let i = 0; i < 15; i += 1) {
    const jugada = jugadaLegal(estado.board);
    if (!jugada) break;
    movimientos.push(jugada);
    estado = applyMove(estado, jugada).state;
  }

  const repeticion = replayGame(partida.seed, movimientos);
  verificar(repeticion.valid && repeticion.score === estado.score, 're-simulación coincide');

  // 3. Puntaje
  const empresa = companyFor(repeticion.score, repeticion.colorCounts);
  const guardado = await postgresStore.saveScore({
    sessionId: partida.id,
    playerId: jugador.id,
    score: repeticion.score,
    companyName: 'Prueba SA',
    companySize: empresa.size,
    companyType: empresa.type,
    colorCounts: repeticion.colorCounts,
  });
  verificar(guardado.score === repeticion.score, `guarda el puntaje (${repeticion.score} pts)`);

  await postgresStore.closeGameSession(partida.id, 'closed');
  verificar(
    (await postgresStore.findGameSession(partida.id))?.status === 'closed',
    'cierra la partida',
  );

  // 4. Una sola fila de puntaje por partida (§4.1)
  let duplicadoRechazado = false;
  try {
    await postgresStore.saveScore({
      sessionId: partida.id,
      playerId: jugador.id,
      score: 999_999,
      companyName: 'Duplicada',
      companySize: 'grande',
      companyType: 'Empresa Comercial / Retail',
      colorCounts: [0, 0, 0, 0, 0],
    });
  } catch {
    duplicadoRechazado = true;
  }
  verificar(duplicadoRechazado, 'la base rechaza dos puntajes para la misma partida');

  // 5. Leaderboard
  const top = await postgresStore.topScores(GAME_RULES.LEADERBOARD_SIZE);
  verificar(top.length <= GAME_RULES.LEADERBOARD_SIZE, `el top trae máximo ${GAME_RULES.LEADERBOARD_SIZE}`);
  verificar(
    top.every((fila) => !JSON.stringify(fila).includes('@')),
    'el leaderboard no expone correos',
  );
  verificar(
    top.every((fila, i) => i === 0 || (top[i - 1]?.score ?? 0) >= fila.score),
    'viene ordenado de mayor a menor',
  );

  const posicion = await postgresStore.standingFor(jugador.id);
  verificar(posicion !== null && posicion.bestScore === repeticion.score, 'calcula la posición del jugador');
} catch (error) {
  console.error('Falló la prueba:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (creadoPlayerId) {
    await pool.query('delete from players where id = $1', [creadoPlayerId]);
    console.log('  ✓ datos de prueba borrados');
  }
  await pool.end();
}
