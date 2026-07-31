'use client';

/**
 * Tablero para proyectar en pantalla durante el evento — INSTRUCCIONES.md §2.7.
 *
 * Se refresca solo cada pocos segundos y resalta a quien acaba de entrar o
 * subir de posición. No muestra más datos que el leaderboard público: nombre,
 * empresa y puntaje (§4.5).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LeaderboardResponse } from '@/lib/apiTypes';
import type { LeaderboardEntry } from '@/lib/server/store/types';
import { GAME_RULES } from '@/lib/game/rules';
import LogoTec from './LogoTec';

/** Cada cuánto se consulta el tablero. Más corto solo gastaría peticiones. */
const REFRESCO_MS = 4_000;
/** Cuánto dura el resaltado de una entrada nueva. */
const DESTACADO_MS = 8_000;

interface Props {
  entradasIniciales: LeaderboardEntry[];
}

/** Identidad estable de una fila: la misma persona con el mismo puntaje. */
function claveDe(entrada: LeaderboardEntry): string {
  return `${entrada.playerName}|${entrada.score}`;
}

export default function TableroEnVivo({ entradasIniciales }: Props) {
  const [entradas, setEntradas] = useState(entradasIniciales);
  const [destacadas, setDestacadas] = useState<Set<string>>(new Set());
  const [sinConexion, setSinConexion] = useState(false);
  const conocidasRef = useRef(new Set(entradasIniciales.map(claveDe)));

  const consultar = useCallback(async () => {
    try {
      const respuesta = await fetch('/api/leaderboard', { cache: 'no-store' });
      if (!respuesta.ok) throw new Error('respuesta no válida');

      const datos = (await respuesta.json()) as LeaderboardResponse;
      setSinConexion(false);

      const nuevas = datos.entries.filter((fila) => !conocidasRef.current.has(claveDe(fila)));
      setEntradas(datos.entries);

      if (nuevas.length === 0) return;

      for (const fila of datos.entries) conocidasRef.current.add(claveDe(fila));
      const claves = nuevas.map(claveDe);
      setDestacadas((previas) => new Set([...previas, ...claves]));

      setTimeout(() => {
        setDestacadas((previas) => {
          const restantes = new Set(previas);
          for (const clave of claves) restantes.delete(clave);
          return restantes;
        });
      }, DESTACADO_MS);
    } catch {
      // Si la red falla, seguimos mostrando el último tablero conocido.
      setSinConexion(true);
    }
  }, []);

  useEffect(() => {
    const intervalo = setInterval(() => void consultar(), REFRESCO_MS);
    return () => clearInterval(intervalo);
  }, [consultar]);

  const lider = entradas[0];

  return (
    <main className="tablero-vivo">
      <header className="tablero-vivo-encabezado">
        <div>
          <h1>Top {GAME_RULES.LEADERBOARD_SIZE}</h1>
          <p>
            {lider
              ? `${lider.playerName} va al frente con ${lider.score.toLocaleString('es-MX')} puntos`
              : 'Escanea el QR y sé la primera persona en el tablero'}
          </p>
        </div>
        <LogoTec />
      </header>

      {entradas.length === 0 ? (
        <p className="tablero-vivo-vacio">Todavía no hay puntajes. ¡Que empiece el juego!</p>
      ) : (
        <ol className="tablero-vivo-lista">
          {entradas.map((entrada) => {
            const clave = claveDe(entrada);
            return (
              <li
                key={clave}
                className={`tablero-vivo-fila${destacadas.has(clave) ? ' es-nueva' : ''}`}
              >
                <span className={`tablero-vivo-puesto puesto puesto-${entrada.rank}`}>
                  {entrada.rank}
                </span>
                <span className="tablero-vivo-datos">
                  <strong>{entrada.playerName}</strong>
                  <small>
                    {entrada.companyName} · {entrada.companyType}
                  </small>
                </span>
                <span className="tablero-vivo-puntaje">
                  {entrada.score.toLocaleString('es-MX')}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <footer className="tablero-vivo-pie">
        <span className={`tablero-vivo-pulso${sinConexion ? ' sin-conexion' : ''}`} aria-hidden="true" />
        {sinConexion ? 'Reintentando conexión…' : 'En vivo'}
      </footer>
    </main>
  );
}
