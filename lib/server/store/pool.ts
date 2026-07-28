/**
 * Conexión a Postgres (Supabase). Aquí vive la única configuración del pool,
 * para que la app y los scripts de `scripts/` se conecten igual (§5.2).
 */
import { Pool, type PoolConfig } from 'pg';

/**
 * TLS de la conexión a la base — INSTRUCCIONES.md §4.8.
 *
 * Por defecto verificamos el certificado contra las CA del sistema. Algunos
 * poolers presentan una cadena que Node no puede validar; para ese caso existe
 * DATABASE_SSL_MODE=no-verify, que mantiene el tráfico cifrado pero deja de
 * autenticar al servidor. Es una degradación real: úsala solo si el
 * diagnóstico (/api/health) reporta un problema de certificado, y déjala
 * documentada en el hosting.
 */
function sslConfig(esLocal: boolean): PoolConfig['ssl'] {
  if (esLocal) return undefined;
  if (process.env.DATABASE_SSL_MODE === 'no-verify') return { rejectUnauthorized: false };
  return { rejectUnauthorized: true };
}

export function poolConfig(connectionString: string): PoolConfig {
  const esLocal =
    connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  // En serverless (Vercel) cada instancia atiende una petición a la vez: un
  // pool grande solo agota las conexiones del pooler de Supabase.
  const esServerless = Boolean(process.env.VERCEL);

  return {
    connectionString,
    ssl: sslConfig(esLocal),
    max: esServerless ? 1 : 5,
    // El pooler de Supabase corta conexiones inactivas; no las retengamos.
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  };
}

export function createPool(connectionString: string): Pool {
  return new Pool(poolConfig(connectionString));
}

/** Oculta credenciales al describir una conexión en logs o mensajes (§4.9). */
export function describeConnection(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    return `${url.hostname}:${url.port || '5432'}/${url.pathname.replace('/', '')}`;
  } catch {
    return 'conexión no reconocible';
  }
}
