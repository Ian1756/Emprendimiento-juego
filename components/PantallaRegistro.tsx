'use client';

/**
 * Registro — INSTRUCCIONES.md §2.1 y §4.5.
 * El consentimiento es explícito y no viene premarcado. La validación real la
 * hace el servidor; la de aquí es solo para dar retroalimentación rápida.
 */
import { useState } from 'react';
import { publicConfig } from '@/lib/config';
import { GAME_RULES } from '@/lib/game/rules';

interface Props {
  onRegistered: (playerName: string) => void;
}

export default function PantallaRegistro({ onRegistered }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, consent }),
      });
      const data = (await response.json()) as { playerName?: string; error?: string };

      if (!response.ok) {
        setError(data.error ?? 'No pudimos registrarte. Intenta de nuevo.');
        return;
      }

      onRegistered(data.playerName ?? name);
    } catch {
      setError('Revisa tu conexión e intenta de nuevo.');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="pantalla justify-center">
      <div className="text-center">
        <p className="text-5xl">🚀</p>
        <h1 className="mt-2 text-3xl font-extrabold">Reto Emprendedor</h1>
        <p className="mt-2 text-[var(--texto-suave)]">
          60 segundos para juntar clientes, ideas, recursos, talento y pasión. Al final descubres
          qué empresa construiste.
        </p>
      </div>

      <form className="tarjeta flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
        <label className="text-sm font-semibold" htmlFor="nombre">
          ¿Cómo te llamas?
        </label>
        <input
          id="nombre"
          className="campo"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={GAME_RULES.PLAYER_NAME_MAX}
          autoComplete="given-name"
          required
        />

        <label className="mt-2 text-sm font-semibold" htmlFor="correo">
          Tu correo electrónico
        </label>
        <input
          id="correo"
          className="campo"
          type="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />

        <label className="mt-2 flex items-start gap-3 text-sm text-[var(--texto-suave)]">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />
          <span>
            Acepto que {publicConfig.organization} use mi nombre y correo para contactarme sobre
            emprendimiento.{' '}
            <a
              className="underline"
              href={publicConfig.privacyUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Aviso de privacidad
            </a>
            .
          </span>
        </label>

        {error ? (
          <p className="text-sm font-semibold text-[var(--pasion)]" role="alert">
            {error}
          </p>
        ) : null}

        <button className="boton boton-primario mt-2" type="submit" disabled={sending}>
          {sending ? 'Entrando…' : 'Entrar al juego'}
        </button>
        <p className="text-center text-xs text-[var(--texto-suave)]">
          Solo te lo pedimos esta vez: la próxima entras directo.
        </p>
      </form>
    </main>
  );
}
