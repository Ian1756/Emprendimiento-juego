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
import { IconoIngrediente } from './IconosJuego';
import LogoTec from './LogoTec';

/** Retrasa la entrada de cada bloque para revelar el resultado por etapas. */
const orden = (i: number) => ({ '--i': i }) as React.CSSProperties;

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
    <ul className="flex flex-col gap-2 text-sm">
      {TILE_COLORS.map((color, index) => {
        const count = colorCounts[index] ?? 0;
        return (
          <li key={color.id} className="flex items-center gap-2">
            <span className={`ficha ficha-${color.ink} ${color.className} h-6 w-6 shrink-0`}>
              <IconoIngrediente colorIndex={index} />
            </span>
            <span className="w-[4.5rem] shrink-0 text-xs font-semibold">{color.label}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/35">
              <span
                className={`barra-color barra-${color.id}`}
                style={
                  {
                    width: `${Math.round((count / total) * 100)}%`,
                    '--i': index,
                  } as React.CSSProperties
                }
              />
            </span>
            <span className="w-7 text-right tabular-nums text-[var(--texto-suave)]">{count}</span>
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
  const esUnicornio = company.size === 'unicornio';

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
      {/* Revelación por etapas: emblema (0ms) → título (~180ms) → puntaje (~360ms).
          Es el momento emotivo del juego, así que aquí sí se toma su tiempo. */}
      <section className="tarjeta text-center">
        <div className={`emblema emblema-${TILE_COLORS[company.colorIndex]?.id ?? 'clientes'}`}>
          <IconoIngrediente colorIndex={company.colorIndex} />
        </div>
        <p className="entra titulo-seccion mt-3" style={orden(3)}>
          Construiste {company.sizeArticle}
        </p>
        <h1
          className={`entra text-2xl font-extrabold${esUnicornio ? ' es-unicornio' : ''}`}
          style={orden(3.5)}
        >
          {company.sizeLabel}
        </h1>
        <p className="entra mt-1 text-lg font-bold text-[var(--acento-alto)]" style={orden(4)}>
          {company.type}
        </p>
        <p className="entra mt-2 text-sm text-[var(--texto-suave)]" style={orden(5)}>
          {company.description}
        </p>
        <p className="entra puntaje-final mt-4" style={orden(6)}>
          {score.toLocaleString('es-MX')}
          <span className="ml-1 text-base font-bold text-[var(--texto-suave)]">pts</span>
        </p>
      </section>

      <section className="tarjeta entra" style={orden(7)}>
        <h2 className="titulo-seccion mb-2.5">Con qué lo lograste</h2>
        <Desglose colorCounts={saved?.colorCounts ?? run.colorCounts} />
      </section>

      {saved ? (
        <section className="tarjeta entra text-center" style={orden(0)}>
          <h2 className="text-xl font-extrabold">
            {saved.madeTopFive ? '¡Entraste al Top 5!' : '¡Listo, quedó guardado!'}
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
            <BotonComunidad label="Conectar por WhatsApp" />
            <BotonCompartir />
            <button className="boton boton-secundario" type="button" onClick={onPlayAgain}>
              Volver a jugar
            </button>
          </div>
        </section>
      ) : (
        <form
          className="tarjeta entra flex flex-col gap-3"
          style={orden(8)}
          onSubmit={handleSubmit}
          noValidate
        >
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

      <div className="pie-marca">
        <LogoTec discreto />
      </div>
    </main>
  );
}
