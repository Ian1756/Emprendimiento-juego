/**
 * Configuración del servidor. Los secretos SOLO viven aquí, nunca con prefijo
 * NEXT_PUBLIC_ — INSTRUCCIONES.md §4.4.
 */
import 'server-only';

const DEV_FALLBACK_SECRET = 'desarrollo-inseguro-cambiar-en-produccion';

function readSecret(name: string): string {
  const value = process.env[name];
  if (value && value.length >= 16) return value;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Falta la variable de entorno ${name} (mínimo 16 caracteres).`);
  }
  // En desarrollo no bloqueamos el arranque, pero el secreto es evidentemente falso.
  return `${DEV_FALLBACK_SECRET}-${name}`;
}

export const serverEnv = {
  get sessionSecret(): string {
    return readSecret('SESSION_SECRET');
  },
  get databaseUrl(): string | undefined {
    return process.env.DATABASE_URL || undefined;
  },
  get dataFile(): string {
    return process.env.DATA_FILE || '.data/db.json';
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  },
};
