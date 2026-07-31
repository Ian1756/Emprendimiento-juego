'use client';

/**
 * La partida — INSTRUCCIONES.md §2.3.
 * Este componente solo pinta y anima: TODA la mecánica vive en lib/game
 * (motor puro). El estado autoritativo del juego está en `engineRef`; `board`,
 * `score` y `clearing` son la vista, que va un poco atrás por la animación.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { areAdjacent, colOf, EMPTY, type Board } from '@/lib/game/board';
import { applyMove, createGame, type Move } from '@/lib/game/engine';
import { GAME_RULES, TILE_COLORS } from '@/lib/game/rules';
import { IconoIngrediente } from './IconosJuego';
import LogoTec from './LogoTec';

/**
 * Tiempos alineados con la identidad de movimiento (ver globals.css):
 * el intercambio es feedback inmediato, la explosión tiene anticipación y la
 * caída se escalona por columna.
 */
const SWAP_MS = 140;
const CLEAR_MS = 190;
const REFILL_MS = 260;
const TICK_MS = 200;
/** Debajo de esto el cronómetro se pone rojo y late. */
const SEGUNDOS_CRITICOS = 10;

export interface RunOutcome {
  score: number;
  colorCounts: number[];
  moves: Move[];
}

interface Props {
  seed: number;
  onFinish: (outcome: RunOutcome) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export default function PantallaJuego({ seed, onFinish }: Props) {
  const engineRef = useRef(createGame(seed));
  const movesRef = useRef<Move[]>([]);
  const finishedRef = useRef(false);
  const endAtRef = useRef(Date.now() + GAME_RULES.DURATION_SECONDS * 1000);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const [board, setBoard] = useState<Board>(engineRef.current.board);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [clearing, setClearing] = useState<number[]>([]);
  const [invalidCell, setInvalidCell] = useState<number | null>(null);
  /** Celdas recién rellenadas: se les aplica la animación de caída. */
  const [cayendo, setCayendo] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(GAME_RULES.DURATION_SECONDS);
  const [gain, setGain] = useState<{ key: number; points: number } | null>(null);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const state = engineRef.current;
    onFinishRef.current({
      score: state.score,
      colorCounts: state.colorCounts,
      moves: movesRef.current,
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) finish();
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [finish]);

  const clearingSet = useMemo(() => new Set(clearing), [clearing]);
  const cayendoSet = useMemo(() => new Set(cayendo), [cayendo]);

  async function playMove(move: Move): Promise<void> {
    const result = applyMove(engineRef.current, move);

    if (!result.ok) {
      setInvalidCell(move.b);
      setTimeout(() => setInvalidCell(null), 250);
      return;
    }

    const scoreBeforeMove = engineRef.current.score;
    movesRef.current.push(move);
    engineRef.current = result.state;
    setBusy(true);

    const fast = prefersReducedMotion();
    setBoard(result.boardAfterSwap);
    if (!fast) await sleep(SWAP_MS);

    let running = scoreBeforeMove;
    for (const step of result.steps) {
      setClearing(step.clearedCells);
      if (!fast) await sleep(CLEAR_MS);

      running += step.gained;
      setScore(running);
      setGain({ key: step.cascadeIndex + movesRef.current.length * 100, points: step.gained });
      setClearing([]);
      setBoard(step.boardAfterRefill);
      // Las celdas que se vaciaron son las que caen: darles la animación de
      // entrada hace que el tablero se rellene en cascada y no de golpe.
      setCayendo(step.clearedCells);
      if (!fast) await sleep(REFILL_MS);
      setCayendo([]);
    }

    if (result.reshuffled) setBoard(engineRef.current.board);
    setBusy(false);
  }

  function handleTap(index: number): void {
    if (busy || finishedRef.current) return;

    if (selected === null || selected === index) {
      setSelected(selected === index ? null : index);
      return;
    }

    if (!areAdjacent(selected, index)) {
      setSelected(index);
      return;
    }

    const move = { a: selected, b: index };
    setSelected(null);
    void playMove(move);
  }

  const tiempoCritico = secondsLeft <= SEGUNDOS_CRITICOS;
  const porcentajeTiempo = (secondsLeft / GAME_RULES.DURATION_SECONDS) * 100;

  return (
    <main className="pantalla">
      <header className="marcador">
        <div>
          <p className="titulo-seccion">Puntos</p>
          <p className={`marcador-cifra${gain ? ' marcador-pulso' : ''}`} key={gain?.key ?? 'base'}>
            {score.toLocaleString('es-MX')}
          </p>
        </div>
        <div className="relative text-right">
          <p className="titulo-seccion">Tiempo</p>
          <p className={`marcador-cifra${tiempoCritico ? ' tiempo-critico' : ''}`}>
            {secondsLeft}
            <span className="ml-0.5 text-base font-bold text-[var(--texto-suave)]">s</span>
          </p>
          {gain ? (
            <span key={gain.key} className="flotante">
              +{gain.points}
            </span>
          ) : null}
        </div>
      </header>

      <div className={`barra-tiempo${tiempoCritico ? ' poco' : ''}`}>
        <span style={{ width: `${porcentajeTiempo}%` }} />
      </div>

      {/* El tablero es el héroe de esta pantalla: se queda centrado en el
          espacio disponible en vez de pegarse arriba. */}
      <div
        className="tablero my-auto"
        style={{ gridTemplateColumns: `repeat(${GAME_RULES.COLS}, minmax(0, 1fr))` }}
        role="grid"
        aria-label="Tablero del juego"
      >
        {board.map((color, index) => {
          const tile = color === EMPTY ? null : TILE_COLORS[color];
          const classes = [
            'ficha',
            tile ? tile.className : 'tile-vacia',
            tile ? `ficha-${tile.ink}` : '',
            selected === index ? 'ficha-seleccionada' : '',
            clearingSet.has(index) ? 'ficha-explotando' : '',
            cayendoSet.has(index) ? 'ficha-cayendo' : '',
            invalidCell === index ? 'ficha-invalida' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              // El índice ES la identidad de la celda: la ficha que ocupa una
              // posición cambia, la posición no.
              key={index}
              type="button"
              className={classes}
              // El retraso por columna escalona la caída de izquierda a derecha.
              style={{ '--col': colOf(index) } as React.CSSProperties}
              onClick={() => handleTap(index)}
              disabled={busy}
              aria-label={tile ? tile.label : 'vacío'}
            >
              {tile ? <IconoIngrediente colorIndex={color} /> : null}
            </button>
          );
        })}
      </div>

      <p className="text-center text-sm text-[var(--texto-suave)]">
        Toca una ficha y luego una vecina. Junta 3 o más iguales.
      </p>

      <div className="pie-marca !mt-2">
        <LogoTec discreto />
      </div>
    </main>
  );
}
