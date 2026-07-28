'use client';

/**
 * Máquina de pantallas del juego — INSTRUCCIONES.md §2.
 * registro → inicio → jugando → resultado → inicio
 */
import { useState } from 'react';
import type { ApiError, LeaderboardResponse, StartSessionResponse, SubmitScoreResponse } from '@/lib/apiTypes';
import type { LeaderboardEntry, PlayerStanding } from '@/lib/server/store/types';
import PantallaInicio from './PantallaInicio';
import PantallaJuego, { type RunOutcome } from './PantallaJuego';
import PantallaRegistro from './PantallaRegistro';
import PantallaResultado, { type RunSummary } from './PantallaResultado';

type Pantalla = 'registro' | 'inicio' | 'jugando' | 'resultado';

interface ActiveRun {
  sessionId: string;
  seed: number;
}

interface Props {
  playerName: string | null;
  entries: LeaderboardEntry[];
  standing: PlayerStanding | null;
}

export default function Juego({ playerName, entries, standing }: Props) {
  const [screen, setScreen] = useState<Pantalla>(playerName ? 'inicio' : 'registro');
  const [name, setName] = useState(playerName ?? '');
  const [leaderboard, setLeaderboard] = useState(entries);
  const [playerStanding, setPlayerStanding] = useState(standing);
  const [run, setRun] = useState<ActiveRun | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshLeaderboard(): Promise<void> {
    try {
      const response = await fetch('/api/leaderboard');
      if (!response.ok) return;
      const data = (await response.json()) as LeaderboardResponse;
      setLeaderboard(data.entries);
      setPlayerStanding(data.standing);
    } catch {
      // El tablero anterior sigue siendo válido; no interrumpimos al jugador.
    }
  }

  function handleRegistered(registeredName: string): void {
    setName(registeredName);
    setScreen('inicio');
    void refreshLeaderboard();
  }

  async function handlePlay(): Promise<void> {
    if (starting) return;
    setStarting(true);
    setError(null);

    try {
      const response = await fetch('/api/sessions', { method: 'POST' });
      const data = (await response.json()) as StartSessionResponse | ApiError;

      if (!response.ok) {
        setError((data as ApiError).error ?? 'No pudimos iniciar la partida.');
        return;
      }

      const session = data as StartSessionResponse;
      setRun({ sessionId: session.sessionId, seed: session.seed });
      setSummary(null);
      setScreen('jugando');
    } catch {
      setError('Revisa tu conexión e intenta de nuevo.');
    } finally {
      setStarting(false);
    }
  }

  function handleFinish(outcome: RunOutcome): void {
    if (!run) return;
    setSummary({ sessionId: run.sessionId, ...outcome });
    setScreen('resultado');
  }

  function handleSaved(result: SubmitScoreResponse): void {
    setLeaderboard(result.leaderboard);
    setPlayerStanding(result.standing);
  }

  function handlePlayAgain(): void {
    setScreen('inicio');
    void refreshLeaderboard();
  }

  if (screen === 'registro') return <PantallaRegistro onRegistered={handleRegistered} />;

  if (screen === 'jugando' && run) {
    // La clave fuerza un componente nuevo por partida: nada de estado viejo.
    return <PantallaJuego key={run.sessionId} seed={run.seed} onFinish={handleFinish} />;
  }

  if (screen === 'resultado' && summary) {
    return (
      <PantallaResultado run={summary} onSaved={handleSaved} onPlayAgain={handlePlayAgain} />
    );
  }

  return (
    <PantallaInicio
      playerName={name}
      entries={leaderboard}
      standing={playerStanding}
      starting={starting}
      error={error}
      onPlay={() => void handlePlay()}
    />
  );
}
