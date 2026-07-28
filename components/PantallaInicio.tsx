'use client';

/** Pantalla de inicio — INSTRUCCIONES.md §2.2. */
import { GAME_RULES, TILE_COLORS } from '@/lib/game/rules';
import type { LeaderboardEntry, PlayerStanding } from '@/lib/server/store/types';
import { BotonComunidad, BotonCompartir } from './BotonesComunidad';
import Leaderboard from './Leaderboard';

interface Props {
  playerName: string;
  entries: LeaderboardEntry[];
  standing: PlayerStanding | null;
  starting: boolean;
  error: string | null;
  onPlay: () => void;
}

export default function PantallaInicio({
  playerName,
  entries,
  standing,
  starting,
  error,
  onPlay,
}: Props) {
  return (
    <main className="pantalla">
      <header className="text-center">
        <h1 className="text-2xl font-extrabold">Hola, {playerName} 👋</h1>
        <p className="text-sm text-[var(--texto-suave)]">
          Tienes {GAME_RULES.DURATION_SECONDS} segundos para construir tu empresa.
        </p>
      </header>

      <Leaderboard entries={entries} standing={standing} />

      <section className="tarjeta">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--texto-suave)]">
          Los cinco ingredientes
        </h2>
        <ul className="grid grid-cols-1 gap-1 text-sm">
          {TILE_COLORS.map((color) => (
            <li key={color.id} className="flex items-center gap-2">
              <span aria-hidden="true">{color.icon}</span>
              <span className="font-semibold">{color.label}</span>
              <span className="text-[var(--texto-suave)]">· {color.company}</span>
            </li>
          ))}
        </ul>
      </section>

      {error ? (
        <p className="text-center text-sm font-semibold text-[var(--pasion)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-auto flex flex-col gap-2">
        <button className="boton boton-primario text-lg" type="button" onClick={onPlay} disabled={starting}>
          {starting ? 'Preparando…' : '▶ Jugar'}
        </button>
        <BotonCompartir />
        <BotonComunidad />
      </div>
    </main>
  );
}
