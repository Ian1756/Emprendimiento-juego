'use client';

/** Top 5 — INSTRUCCIONES.md §2.2. Solo nombre público, empresa y puntaje. */
import type { LeaderboardEntry, PlayerStanding } from '@/lib/server/store/types';
import { GAME_RULES } from '@/lib/game/rules';

interface Props {
  entries: LeaderboardEntry[];
  standing: PlayerStanding | null;
}

export default function Leaderboard({ entries, standing }: Props) {
  const outsideTop = standing !== null && standing.rank > GAME_RULES.LEADERBOARD_SIZE;

  return (
    <section className="tarjeta" aria-label="Tabla de puntajes">
      <h2 className="titulo-seccion mb-2.5">Top {GAME_RULES.LEADERBOARD_SIZE}</h2>

      {entries.length === 0 ? (
        <p className="text-sm text-[var(--texto-suave)]">
          Todavía nadie juega. Sé la primera persona en el tablero.
        </p>
      ) : (
        <ol className="flex flex-col gap-0.5">
          {entries.map((entry) => (
            <li
              key={`${entry.rank}-${entry.playerName}`}
              className={`fila-top fila-top-${entry.rank}`}
            >
              <span className={`puesto puesto-${entry.rank}`}>{entry.rank}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{entry.playerName}</span>
                <span className="block truncate text-xs text-[var(--texto-suave)]">
                  {entry.companyName} · {entry.companyType}
                </span>
              </span>
              <span className="font-extrabold tabular-nums">
                {entry.score.toLocaleString('es-MX')}
              </span>
            </li>
          ))}
        </ol>
      )}

      {outsideTop && standing ? (
        <p className="mt-3 border-t border-[var(--borde)] pt-3 text-sm text-[var(--texto-suave)]">
          Tú: <strong className="text-[var(--texto)]">#{standing.rank}</strong> —{' '}
          {standing.bestScore.toLocaleString('es-MX')} pts
        </p>
      ) : null}
    </section>
  );
}
