'use client';

/**
 * La partida — INSTRUCCIONES.md §2.3.
 * Este componente solo pinta y anima: TODA la mecánica vive en lib/game
 * (motor puro). El estado autoritativo del juego está en `engineRef`; `board`,
 * `score` y `clearing` son la vista, que va un poco atrás por la animación.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { areAdjacent, colOf, EMPTY, indexOf, rowOf, type Board } from '@/lib/game/board';
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
const SHAKE_MS = 340;
/** Debajo de esto el cronómetro se pone rojo y late. */
const SEGUNDOS_CRITICOS = 10;
/** Píxeles que hay que recorrer antes de considerar que es un arrastre. */
const UMBRAL_ARRASTRE = 8;

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

interface Arrastre {
  origen: number;
  /** Desplazamiento del dedo, ya recortado a una celda y a un solo eje. */
  dx: number;
  dy: number;
  /** Vecina hacia la que apunta el gesto, o null si aún no se decide. */
  destino: number | null;
}

/**
 * Vecina en la dirección dominante del gesto. Solo ortogonales y dentro del
 * tablero: no se puede arrastrar en diagonal ni hacia afuera (§2.3).
 */
function vecinaEnDireccion(origen: number, dx: number, dy: number): number | null {
  const fila = rowOf(origen);
  const columna = colOf(origen);

  if (Math.abs(dx) >= Math.abs(dy)) {
    const siguiente = columna + (dx > 0 ? 1 : -1);
    if (siguiente < 0 || siguiente >= GAME_RULES.COLS) return null;
    return indexOf(fila, siguiente);
  }

  const siguiente = fila + (dy > 0 ? 1 : -1);
  if (siguiente < 0 || siguiente >= GAME_RULES.ROWS) return null;
  return indexOf(siguiente, columna);
}

export default function PantallaJuego({ seed, onFinish }: Props) {
  const engineRef = useRef(createGame(seed));
  const movesRef = useRef<Move[]>([]);
  const finishedRef = useRef(false);
  const endAtRef = useRef(Date.now() + GAME_RULES.DURATION_SECONDS * 1000);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  /** Punto donde empezó el gesto actual. */
  const inicioRef = useRef<{ x: number; y: number; indice: number } | null>(null);
  /** Si el gesto llegó a ser arrastre, el clic posterior se ignora. */
  const arrastroRef = useRef(false);
  const ignorarClicRef = useRef(false);
  /** Lado de una celda en píxeles, para no arrastrar más de una posición. */
  const ladoCeldaRef = useRef(0);

  const [board, setBoard] = useState<Board>(engineRef.current.board);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [clearing, setClearing] = useState<number[]>([]);
  /** Las DOS fichas del intento fallido: ambas tambalean. */
  const [invalidCells, setInvalidCells] = useState<number[]>([]);
  /** Celdas recién rellenadas: se les aplica la animación de caída. */
  const [cayendo, setCayendo] = useState<number[]>([]);
  /** Arrastre en curso. `destino` es la vecina hacia la que apunta el dedo. */
  const [drag, setDrag] = useState<Arrastre | null>(null);
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
      // Movimiento imposible: las dos fichas involucradas tambalean y todo
      // vuelve a su sitio. Es la única señal de error del juego.
      setInvalidCells([move.a, move.b]);
      setTimeout(() => setInvalidCells([]), SHAKE_MS);
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

  /* ---------------------------------------------------------------------
     Arrastre. Se usan eventos de puntero para que el mismo código sirva con
     dedo y con ratón. El toque simple sigue funcionando: si el dedo no se
     movió lo suficiente, el gesto se trata como selección.
     --------------------------------------------------------------------- */

  function handlePointerDown(index: number, event: React.PointerEvent<HTMLButtonElement>): void {
    if (busy || finishedRef.current) return;

    inicioRef.current = { x: event.clientX, y: event.clientY, indice: index };
    arrastroRef.current = false;
    // Se limpia aquí y no al recibir el clic: si un arrastre termina fuera de
    // la ficha no llega ningún clic que la consuma, y la bandera se quedaría
    // encendida tragándose el siguiente toque.
    ignorarClicRef.current = false;
    // Capturar el puntero permite seguir el dedo aunque salga de la ficha.
    event.currentTarget.setPointerCapture(event.pointerId);
    ladoCeldaRef.current = event.currentTarget.getBoundingClientRect().width;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>): void {
    const inicio = inicioRef.current;
    if (!inicio || busy || finishedRef.current) return;

    const dx = event.clientX - inicio.x;
    const dy = event.clientY - inicio.y;
    if (Math.hypot(dx, dy) < UMBRAL_ARRASTRE) return;

    arrastroRef.current = true;
    const destino = vecinaEnDireccion(inicio.indice, dx, dy);
    const lado = ladoCeldaRef.current || 1;
    const horizontal = Math.abs(dx) >= Math.abs(dy);

    // La ficha sigue al dedo en un solo eje y sin pasarse de una celda: así se
    // lee como un intercambio y no como si se pudiera soltar en cualquier lado.
    const recorte = (valor: number) => Math.max(-lado, Math.min(lado, valor));

    setSelected(null);
    setDrag({
      origen: inicio.indice,
      dx: horizontal ? recorte(dx) : 0,
      dy: horizontal ? 0 : recorte(dy),
      destino,
    });
  }

  function handlePointerUp(): void {
    const inicio = inicioRef.current;
    const gesto = drag;
    inicioRef.current = null;
    setDrag(null);

    if (!inicio || !arrastroRef.current) return;
    // Hubo arrastre: el clic que viene detrás no debe tratarse como toque.
    ignorarClicRef.current = true;

    if (!gesto || gesto.destino === null) return;
    void playMove({ a: gesto.origen, b: gesto.destino });
  }

  function handleClick(index: number): void {
    // El clic que sigue a un arrastre no debe contar también como toque.
    if (ignorarClicRef.current) return;
    handleTap(index);
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
          const esArrastrada = drag?.origen === index;
          const esDestino = drag?.destino === index;

          const classes = [
            'ficha',
            tile ? tile.className : 'tile-vacia',
            tile ? `ficha-${tile.ink}` : '',
            selected === index ? 'ficha-seleccionada' : '',
            esArrastrada ? 'ficha-arrastrada' : '',
            clearingSet.has(index) ? 'ficha-explotando' : '',
            cayendoSet.has(index) ? 'ficha-cayendo' : '',
            invalidCells.includes(index) ? 'ficha-invalida' : '',
          ]
            .filter(Boolean)
            .join(' ');

          // La arrastrada sigue al dedo; la vecina se aparte lo mismo en
          // sentido contrario, así el intercambio se ve antes de soltar.
          const estilo: React.CSSProperties = { '--col': colOf(index) } as React.CSSProperties;
          if (esArrastrada && drag) {
            estilo.transform = `translate(${drag.dx}px, ${drag.dy}px)`;
          } else if (esDestino && drag) {
            estilo.transform = `translate(${-drag.dx * 0.6}px, ${-drag.dy * 0.6}px)`;
          }

          return (
            <button
              // El índice ES la identidad de la celda: la ficha que ocupa una
              // posición cambia, la posición no.
              key={index}
              type="button"
              className={classes}
              // El retraso por columna escalona la caída de izquierda a derecha.
              style={estilo}
              onPointerDown={(event) => handlePointerDown(index, event)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onClick={() => handleClick(index)}
              disabled={busy}
              aria-label={tile ? tile.label : 'vacío'}
            >
              {tile ? <IconoIngrediente colorIndex={color} /> : null}
            </button>
          );
        })}
      </div>

      <p className="text-center text-sm text-[var(--texto-suave)]">
        Arrastra una ficha hacia una vecina, o toca las dos. Junta 3 o más iguales.
      </p>

      <div className="pie-marca !mt-2">
        <LogoTec discreto />
      </div>
    </main>
  );
}
