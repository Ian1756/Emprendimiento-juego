/**
 * Marca del evento: el rayo del Tec + "TEC CEM". Aparece en todas las pantallas.
 *
 * El PNG es una silueta negra sobre transparente, así que se pinta con
 * `mask-image` y `background-color: currentColor`: así toma el color del texto
 * y funciona igual sobre fondo oscuro o claro, sin necesidad de dos archivos.
 */
import { publicConfig } from '@/lib/config';

type Tamano = 'normal' | 'grande';

interface Props {
  tamano?: Tamano;
  /** En pantallas donde la marca no es el foco, baja su presencia. */
  discreto?: boolean;
}

export default function LogoTec({ tamano = 'normal', discreto = false }: Props) {
  return (
    <div
      className={`marca marca-${tamano}${discreto ? ' marca-discreta' : ''}`}
      aria-label={publicConfig.organization}
    >
      <span className="marca-rayo" role="presentation" />
      <span className="marca-texto">TEC CEM</span>
    </div>
  );
}
