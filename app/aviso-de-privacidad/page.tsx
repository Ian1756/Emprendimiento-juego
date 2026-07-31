/**
 * Aviso de privacidad — INSTRUCCIONES.md §4.5 (LFPDPPP).
 * PENDIENTE: la organización debe revisar y completar los datos del responsable
 * y el domicilio antes del evento.
 */
import Link from 'next/link';
import LogoTec from '@/components/LogoTec';
import { publicConfig } from '@/lib/config';

export const metadata = { title: 'Aviso de privacidad | Reto Emprendedor' };

export default function Page() {
  return (
    <main className="pantalla">
      <div className="text-center">
        <LogoTec />
      </div>
      <h1 className="text-2xl font-extrabold">Aviso de privacidad</h1>

      <section className="tarjeta flex flex-col gap-3 text-sm leading-relaxed">
        <p>
          <strong>Responsable.</strong> {publicConfig.organization} es responsable del tratamiento
          de tus datos personales.
        </p>
        <p>
          <strong>Qué recabamos.</strong> Tu <strong>nombre</strong>, tu{' '}
          <strong>matrícula</strong> y tu <strong>correo electrónico</strong>, junto con los
          puntajes que obtienes en el juego. No pedimos teléfono, edad, carrera ni ubicación.
        </p>
        <p>
          <strong>Para qué los usamos.</strong> Para mostrar tu nombre en la tabla de puntajes del
          juego y para contactarte con información sobre actividades, talleres y convocatorias de
          emprendimiento.
        </p>
        <p>
          <strong>Qué es público.</strong> Solo tu nombre, el nombre de tu empresa y tu puntaje, y
          únicamente si quedas dentro del Top 5.{' '}
          <strong>Tu correo y tu matrícula nunca se muestran</strong> ni se comparten con terceros.
        </p>
        <p>
          <strong>Derechos ARCO.</strong> Puedes solicitar el acceso, rectificación, cancelación u
          oposición al tratamiento de tus datos, así como la revocación de tu consentimiento,
          escribiendo a la organización responsable.
        </p>
        <p>
          <strong>Conservación.</strong> Los datos se conservan mientras dure la iniciativa de
          emprendimiento y se eliminan cuando dejan de ser necesarios para esos fines.
        </p>
      </section>

      <Link className="boton boton-secundario" href="/">
        Volver al juego
      </Link>
    </main>
  );
}
