/**
 * Aplica db/schema.sql a la base configurada en DATABASE_URL.
 * Uso: npm run db:migrate
 *
 * El script nunca imprime la cadena de conexión completa (§4.9).
 */
import { readFile } from 'node:fs/promises';
import { createPool, describeConnection } from '../lib/server/store/pool';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    'Falta DATABASE_URL. Ponla en .env.local (ver README, sección "Con Supabase").',
  );
  process.exit(1);
}

const pool = createPool(connectionString);
console.log(`Conectando a ${describeConnection(connectionString)}…`);

try {
  const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  console.log('Esquema aplicado.');

  const tablas = await pool.query<{ table_name: string; filas: string }>(
    `select table_name,
            (select count(*) from information_schema.columns c
              where c.table_name = t.table_name) as filas
       from information_schema.tables t
      where table_schema = 'public'
        and table_name in ('players', 'game_sessions', 'scores')
      order by table_name`,
  );

  if (tablas.rowCount !== 3) {
    console.error('No se crearon las tres tablas esperadas.');
    process.exit(1);
  }

  for (const fila of tablas.rows) {
    console.log(`  ✓ ${fila.table_name} (${fila.filas} columnas)`);
  }
} catch (error) {
  console.error('Falló la migración:', error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await pool.end();
}
