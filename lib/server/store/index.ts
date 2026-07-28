import 'server-only';
import { serverEnv } from '../env';
import { fileStore } from './fileStore';
import type { Store } from './types';

let selected: Store | null = null;

/** Postgres si hay DATABASE_URL; si no, archivo JSON local (§3). */
export async function getStore(): Promise<Store> {
  if (selected) return selected;

  if (serverEnv.databaseUrl) {
    const { postgresStore } = await import('./postgresStore');
    selected = postgresStore;
    return selected;
  }

  // El almacén en archivo no sirve en producción: en Vercel el sistema de
  // archivos es de solo lectura y, aunque escribiera, cada instancia tendría
  // sus propios datos. Fallar aquí con un mensaje claro es mejor que un 500
  // misterioso al primer registro.
  if (serverEnv.isProduction) {
    throw new Error(
      'Falta DATABASE_URL: en producción la app requiere Postgres. ' +
        'Configúrala en las variables de entorno del hosting.',
    );
  }

  selected = fileStore;
  return selected;
}

export type * from './types';
