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
  } else {
    selected = fileStore;
  }

  return selected;
}

export type * from './types';
