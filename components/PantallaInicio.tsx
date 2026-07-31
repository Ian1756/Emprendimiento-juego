'use client';

/** Pantalla de inicio — INSTRUCCIONES.md §2.2. */
import type { CSSProperties } from 'react';
import { mensajeDeIntentos, type Intentos } from '@/lib/game/intentos';
import { GAME_RULES, TILE_COLORS } from '@/lib/game/rules';
import type { LeaderboardEntry, PlayerStanding } from '@/lib/server/store/types';
import { BotonComunidad, BotonCompartir } from './BotonesComunidad';
import { IconoIngrediente } from './IconosJuego';
import Leaderboard from './Leaderboard';
import LogoTec from './LogoTec';

interface Props {
  playerName: string;
  entries: LeaderboardEntry[];
  standing: PlayerStanding | null;
  intentos: Intentos;
  starting: boolean;
  error: string | null;
  onPlay: () => void;
}

/** Escalona la entrada de los bloques: hero primero, acciones al final. */
const orden = (i: number) => ({ '--i': i }) as CSSProperties;

export default function PantallaInicio({
  playerName,
  entries,
  standing,
  intentos,
  starting,
  error,
  onPlay,
}: Props) {
  const sinIntentos = intentos.restantes === 0;

  return (
    <main className="pantalla">
      <header className="entra text-center" style={orden(0)}>
        <LogoTec />
        <h1 className="mt-3 text-2xl font-extrabold">Hola, {playerName}</h1>
        <p className="text-sm text-[var(--texto-suave)]">
          {intentos.usados === 0
            ? `Tienes ${GAME_RULES.DURATION_SECONDS} segundos para construir tu empresa.`
            : mensajeDeIntentos(intentos)}
        </p>
      </header>

      <div className="entra" style={orden(1)}>
        <Leaderboard entries={entries} standing={standing} />
      </div>

      <section className="tarjeta entra" style={orden(2)}>
        <h2 className="titulo-seccion mb-2">Los cinco ingredientes</h2>
        <ul className="flex flex-col gap-1.5 text-sm">
          {TILE_COLORS.map((color, index) => (
            <li key={color.id} className="flex items-center gap-2.5">
              <span className={`ficha ficha-${color.ink} ${color.className} h-7 w-7 shrink-0`}>
                <IconoIngrediente colorIndex={index} />
              </span>
              <span className="font-bold">{color.label}</span>
              <span className="truncate text-[var(--texto-suave)]">· {color.company}</span>
            </li>
          ))}
        </ul>
      </section>

      {error ? (
        <p className="text-center text-sm font-semibold text-[var(--pasion)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="entra mt-auto flex flex-col gap-2 pt-2" style={orden(3)}>
        {sinIntentos ? (
          <p className="tarjeta text-center text-sm font-semibold">
            Ya usaste tus {intentos.maximo} partidas.
            <span className="mt-1 block font-normal text-[var(--texto-suave)]">
              Comparte el juego y conecta con la comunidad.
            </span>
          </p>
        ) : (
          <button
            className="boton boton-primario text-lg"
            type="button"
            onClick={onPlay}
            disabled={starting}
          >
            {starting ? 'Preparando…' : intentos.usados === 0 ? 'Jugar' : 'Jugar mi última partida'}
          </button>
        )}
        <BotonCompartir />
        <BotonComunidad />
      </div>
    </main>
  );
}
