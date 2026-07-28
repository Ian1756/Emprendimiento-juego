'use client';

/**
 * Compartir y unirse a la comunidad — INSTRUCCIONES.md §2.2.
 * Todo enlace externo lleva rel="noopener noreferrer" (§4.8).
 */
import { useState } from 'react';
import { publicConfig } from '@/lib/config';

const CONFIRMATION_MS = 2_000;

export function BotonCompartir() {
  const [message, setMessage] = useState<string | null>(null);

  async function share(): Promise<void> {
    const url = window.location.origin;
    const text = '¿Cuánto aguantas emprendiendo 60 segundos? Juega el Reto Emprendedor:';

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Reto Emprendedor', text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setMessage('¡Enlace copiado!');
    } catch {
      // El usuario canceló el diálogo o el navegador bloqueó el portapapeles.
      setMessage(url);
    } finally {
      setTimeout(() => setMessage(null), CONFIRMATION_MS);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button className="boton boton-secundario" type="button" onClick={() => void share()}>
        🔗 Compartir el juego
      </button>
      {message ? (
        <p className="text-center text-xs text-[var(--texto-suave)]" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function BotonComunidad({ label = '💬 Únete a la comunidad' }: { label?: string }) {
  return (
    <a
      className="boton boton-whatsapp"
      href={publicConfig.whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  );
}
