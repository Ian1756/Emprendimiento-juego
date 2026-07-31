'use client';

/**
 * Resultado, nombre de la empresa y cierre — INSTRUCCIONES.md §2.6.
 * El puntaje que se muestra al final es el que devuelve el servidor, no el que
 * calculó el navegador (§4.1).
 */
import { useState } from 'react';
import type { ApiError, SubmitScoreResponse } from '@/lib/apiTypes';
import { companyFor } from '@/lib/game/company';
import type { Move } from '@/lib/game/engine';
import { GAME_RULES, TILE_COLORS } from '@/lib/game/rules';
import { publicConfig } from '@/lib/config';
import { BotonComunidad, BotonCompartir } from './BotonesComunidad';

export interface RunSummary {
  sessionId: string;
  score: number;
  colorCounts: number[];
  moves: Move[];
}

interface Props {
  run: RunSummary;
  onSaved: (result: SubmitScoreResponse) => void;
  onPlayAgain: () => void;
}

function Desglose({ colorCounts }: { colorCounts: number[] }) {
  const total = colorCounts.reduce((sum, value) => sum + value, 0) || 1;

  return (
    <ul className="flex flex-col gap-1 text-sm">
      {TILE_COLORS.map((color, index) => {
        const count = colorCounts[index] ?? 0;
        return (
          <li key={color.id} className="flex items-center gap-2">
            <span aria-hidden="true">{color.icon}</span>
            <span className="w-20 shrink-0">{color.label}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#0f1528]">
              <span
                className={`block h-full ${color.className}`}
                style={{ width: `${Math.round((count / total) * 100)}%` }}
              />
            </span>
            <span className="w-8 text-right tabular-nums text-[var(--texto-suave)]">{count}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function PantallaResultado({ run, onSaved, onPlayAgain }: Props) {
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState<SubmitScoreResponse | null>(null);

  // Vista previa local; el resultado definitivo llega del servidor al guardar.
  const preview = companyFor(run.score, run.colorCounts);
  const company = saved?.company ?? preview;
  const score = saved?.score ?? run.score;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: run.sessionId,
          companyName,
          moves: run.moves,
        }),
      });
      const data = (await response.json()) as SubmitScoreResponse | ApiError;

      if (!response.ok) {
        setError((data as ApiError).error ?? 'No pudimos guardar tu puntaje.');
        return;
      }

      const result = data as SubmitScoreResponse;
      setSaved(result);
      onSaved(result);
    } catch {
      setError('Revisa tu conexión e intenta de nuevo.');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="pantalla">
      <section className="tarjeta text-center">
        <p className="text-5xl" aria-hidden="true">
          {company.icon}
        </p>
        <p className="mt-1 text-sm uppercase tracking-wide text-[var(--texto-suave)]">
          Construiste {company.sizeArticle}
        </p>
        <h1 className="text-2xl font-extrabold">{company.sizeLabel}</h1>
        <p className="mt-1 text-lg font-bold text-[var(--acento)]">{company.type}</p>
        <p className="mt-2 text-sm text-[var(--texto-suave)]">{company.description}</p>
        <p className="mt-3 text-4xl font-extrabold tabular-nums">
          {score.toLocaleString('es-MX')}
          <span className="ml-1 text-base font-semibold text-[var(--texto-suave)]">pts</span>
        </p>
      </section>

      <section className="tarjeta">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--texto-suave)]">
          Con qué lo lograste
        </h2>
        <Desglose colorCounts={saved?.colorCounts ?? run.colorCounts} />
      </section>

      {saved ? (
        <section className="tarjeta text-center">
          <h2 className="text-xl font-extrabold">
            {saved.madeTopFive ? '🏆 ¡Entraste al Top 5!' : '¡Listo, quedó guardado!'}
          </h2>
          {saved.standing ? (
            <p className="mt-1 text-sm text-[var(--texto-suave)]">
              Tu mejor marca: #{saved.standing.rank} con{' '}
              {saved.standing.bestScore.toLocaleString('es-MX')} pts.
            </p>
          ) : null}
          <p className="mt-4 text-lg font-bold">¿Quieres hacer esto en la vida real?</p>
          <p className="text-sm text-[var(--texto-suave)]">
            Conecta con {publicConfig.organization} y convierte tu idea en una empresa de verdad.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <BotonComunidad label="💬 Conectar por WhatsApp" />
            <BotonCompartir />
            <button className="boton boton-secundario" type="button" onClick={onPlayAgain}>
              Volver a jugar
            </button>
          </div>
        </section>
      ) : (
        <form className="tarjeta flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
          <label className="text-sm font-semibold" htmlFor="empresa">
            Ponle nombre a tu empresa
          </label>
          <input
            id="empresa"
            className="campo"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            maxLength={GAME_RULES.COMPANY_NAME_MAX}
            placeholder="Ej. Raíces MX"
            required
          />
          {error ? (
            <p className="text-sm font-semibold text-[var(--pasion)]" role="alert">
              {error}
            </p>
          ) : null}
          <button className="boton boton-primario" type="submit" disabled={sending}>
            {sending ? 'Guardando…' : 'Guardar en el tablero'}
          </button>
        </form>
      )}
    </main>
  );
}
