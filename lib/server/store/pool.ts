/**
 * Conexión a Postgres (Supabase). Aquí vive la única configuración del pool,
 * para que la app y los scripts de `scripts/` se conecten igual (§5.2).
 */
import { Pool, type PoolConfig } from 'pg';

/**
 * Supabase exige TLS. Verificamos el certificado contra las CA del sistema
 * salvo que la conexión sea local. No usamos rejectUnauthorized:false: eso
 * apagaría la protección contra intermediarios (§4.8).
 */
export function poolConfig(connectionString: string): PoolConfig {
  const esLocal =
    connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  // En serverless (Vercel) cada instancia atiende una petición a la vez: un
  // pool grande solo agota las conexiones del pooler de Supabase.
  const esServerless = Boolean(process.env.VERCEL);

  return {
    connectionString,
    ssl: esLocal ? undefined : { rejectUnauthorized: true },
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
