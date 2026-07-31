/**
 * Los cinco ingredientes, dibujados a mano en SVG en vez de emoji.
 *
 * Por qué no emoji: cada sistema operativo los dibuja distinto (el 👥 de
 * Android no se parece al de iPhone), no se pueden colorear y se ven borrosos
 * al proyectarlos. Estos comparten grosor, esquinas redondeadas y caja de
 * 24×24, así que el tablero se lee como un set y no como una colección
 * prestada.
 *
 * Además cada ingrediente tiene una silueta distinta: quien no distingue
 * colores sigue pudiendo jugar (§6).
 */
import type { ColorIndex } from '@/lib/game/rules';

interface Props {
  className?: string;
}

function Marco({ children, className }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Clientes: dos personas, la de atrás más pequeña para dar profundidad. */
export function IconoClientes({ className }: Props) {
  return (
    <Marco className={className}>
      <circle cx="16.6" cy="8.8" r="2.5" opacity="0.55" />
      <path
        d="M14.8 13.2c3.2-.7 6.4 1.1 6.4 4.3v.9h-4.6v-.9c0-1.6-.7-3.1-1.8-4.3z"
        opacity="0.55"
      />
      <circle cx="9.4" cy="7.6" r="3.6" />
      <path d="M2.6 19.4c0-3.7 3-6.1 6.8-6.1s6.8 2.4 6.8 6.1v.6H2.6z" />
    </Marco>
  );
}

/** Ideas: foco encendido, con los rayos apenas insinuados. */
export function IconoIdeas({ className }: Props) {
  return (
    <Marco className={className}>
      <path d="M12 2.2a7 7 0 0 0-4 12.7c.6.4.9 1 .9 1.7v.3h6.2v-.3c0-.7.3-1.3.9-1.7A7 7 0 0 0 12 2.2z" />
      <rect x="8.9" y="18.4" width="6.2" height="1.9" rx="0.95" />
      <rect x="9.9" y="21" width="4.2" height="1.7" rx="0.85" />
      <g opacity="0.5">
        <rect x="11.2" y="0" width="1.6" height="2" rx="0.8" />
        <rect x="2.3" y="8.4" width="2" height="1.6" rx="0.8" />
        <rect x="19.7" y="8.4" width="2" height="1.6" rx="0.8" />
      </g>
    </Marco>
  );
}

/** Recursos: un brote creciendo, dos hojas asimétricas. */
export function IconoRecursos({ className }: Props) {
  return (
    <Marco className={className}>
      <rect x="11.1" y="12" width="1.8" height="10" rx="0.9" />
      <path d="M12.4 13.4c0-4.4 3.2-7.2 7.8-7.2 0 4.4-3.2 7.2-7.8 7.2z" />
      <path d="M11.6 16.2c0-3.4-2.6-5.6-6.2-5.6 0 3.4 2.6 5.6 6.2 5.6z" opacity="0.6" />
    </Marco>
  );
}

/** Talento: birrete con la borla colgando. */
export function IconoTalento({ className }: Props) {
  return (
    <Marco className={className}>
      <path d="M12 2.6 1.2 8l10.8 5.4L22.8 8z" />
      <path
        d="M5.6 11.1v4.4c0 2 2.9 3.5 6.4 3.5s6.4-1.5 6.4-3.5v-4.4L12 14.3z"
        opacity="0.6"
      />
      <rect x="21.1" y="8.6" width="1.5" height="6.2" rx="0.75" opacity="0.6" />
      <circle cx="21.85" cy="16" r="1.6" opacity="0.6" />
    </Marco>
  );
}

/** Pasión: corazón macizo, la silueta más reconocible del set. */
export function IconoPasion({ className }: Props) {
  return (
    <Marco className={className}>
      <path d="M12 21.4c-.4 0-8.8-5-8.8-11A5 5 0 0 1 12 6.8a5 5 0 0 1 8.8 3.6c0 6-8.4 11-8.8 11z" />
    </Marco>
  );
}

const ICONOS = [
  IconoClientes,
  IconoIdeas,
  IconoRecursos,
  IconoTalento,
  IconoPasion,
] as const;

/** Icono por índice de color, en el mismo orden que TILE_COLORS. */
export function IconoIngrediente({
  colorIndex,
  className,
}: Props & { colorIndex: ColorIndex }) {
  const Icono = ICONOS[colorIndex] ?? IconoClientes;
  return <Icono className={className} />;
}
