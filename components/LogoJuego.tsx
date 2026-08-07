/**
 * Logo del juego. Convive con la marca institucional (`LogoTec`): este
 * identifica al juego, aquel a quien lo organiza.
 *
 * Se sirve `logo-juego.webp` (139 KB) en vez del PNG (453 KB): en un evento con
 * el WiFi saturado esos 300 KB por persona se notan. `logo-juego.png` se
 * conserva como original sin pérdida por si hay que reexportarlo.
 *
 * Va con <img> y no con next/image porque es un único recurso estático y así
 * no depende del optimizador bajo una CSP estricta.
 */
interface Props {
  /** `hero` en la portada; `compacto` en cabeceras. */
  tamano?: 'hero' | 'compacto';
  className?: string;
}

export default function LogoJuego({ tamano = 'hero', className = '' }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- recurso estático único, sin optimizador.
    <img
      src="/logo-juego.webp"
      alt="Match'n' Build"
      className={`logo-juego logo-juego-${tamano} ${className}`.trim()}
      width={640}
      height={510}
      decoding="async"
    />
  );
}
