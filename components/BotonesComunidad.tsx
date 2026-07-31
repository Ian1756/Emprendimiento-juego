'use client';

/**
 * Compartir y unirse a la comunidad — INSTRUCCIONES.md §2.2.
 * Todo enlace externo lleva rel="noopener noreferrer" (§4.8).
 */
import { useState } from 'react';
import { publicConfig } from '@/lib/config';
import { GAME_RULES } from '@/lib/game/rules';

const CONFIRMATION_MS = 2_000;

export function BotonCompartir() {
  const [message, setMessage] = useState<string | null>(null);

  async function share(): Promise<void> {
    const url = window.location.origin;
    const text = `¿Cuánto aguantas emprendiendo ${GAME_RULES.DURATION_SECONDS} segundos? Juega el Reto Emprendedor:`;

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
        <IconoCompartir />
        Compartir el juego
      </button>
      {message ? (
        <p className="text-center text-xs text-[var(--texto-suave)]" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function BotonComunidad({ label = 'Únete a la comunidad' }: { label?: string }) {
  return (
    <a
      className="boton boton-whatsapp"
      href={publicConfig.whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <IconoWhatsapp />
      {label}
    </a>
  );
}

/** Iconos de acción, del mismo set que los del juego: 24×24, currentColor. */
function IconoCompartir() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.7 15.4 6.9l1 1.7-6.8 3.8zm0 2.6 6.8 3.8-1 1.7-6.8-3.8z" />
    </svg>
  );
}

function IconoWhatsapp() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.6 14.1c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6s.6-1.8.9-2.1c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.1.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.1.3.6 1.1 1.4 1.8 1 .9 1.8 1.1 2 1.2.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.5.3.1.2.1.6-.2 1.1z" />
    </svg>
  );
}
