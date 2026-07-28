/**
 * Adaptador de Postgres. Se activa solo si existe DATABASE_URL.
 * El esquema está en db/schema.sql y debe aplicarse antes del primer arranque.
 */
import 'server-only';
import type { Pool } from 'pg';
import { serverEnv } from '../env';
import { createPool } from './pool';
import type {
  GameSession,
  LeaderboardEntry,
  Player,
  PlayerStanding,
  SessionStatus,
  Store,
} from './types';

let pool: Pool | null = null;

function db(): Pool {
  if (pool) return pool;
  const connectionString = serverEnv.databaseUrl;
  if (!connectionString) throw new Error('DATABASE_URL no está configurada.');
  pool = createPool(connectionString);
  return pool;
}

interface PlayerRow {
  id: string;
  display_name: string;
  email: string;
  consent_at: Date;
  created_at: Date;
}

interface SessionRow {
  id: string;
  player_id: string;
  seed: string;
  started_at: Date;
  ended_at: Date | null;
  status: SessionStatus;
}

interface ScoreRow {
  id: string;
  session_id: string;
  player_id: string;
  score: number;
  company_name: string;
  company_size: string;
  company_type: string;
  color_counts: number[];
  created_at: Date;
  display_name?: string;
}

function toPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    consentAt: row.consent_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  };
}

function toSession(row: SessionRow): GameSession {
  return {
    id: row.id,
    playerId: row.player_id,
    seed: Number(row.seed),
    startedAt: row.started_at.toISOString(),
    endedAt: row.ended_at ? row.ended_at.toISOString() : null,
    status: row.status,
  };
}

/**
 * Mejor puntaje por jugador, ordenado. Se usa como CTE en las dos consultas del
 * leaderboard para no duplicar la regla de ranking (§5.2).
 */
const RANKED_SCORES_CTE = `
  with mejores as (
    select distinct on (player_id) *
    from scores
    order by player_id, score desc, created_at asc
  ),
  ranking as (
    select mejores.*,
           row_number() over (order by score desc, created_at asc) as posicion
    from mejores
  )
`;

export const postgresStore: Store = {
  async findPlayerByEmail(email) {
    // lower() en ambos lados: usa el índice único players_email_unico.
    const result = await db().query<PlayerRow>(
      'select * from players where lower(email) = lower($1)',
      [email],
    );
    const row = result.rows[0];
    return row ? toPlayer(row) : null;
  },

  async findPlayerById(id) {
    const result = await db().query<PlayerRow>('select * from players where id = $1', [id]);
    const row = result.rows[0];
    return row ? toPlayer(row) : null;
  },

  async createPlayer({ displayName, email }) {
    const result = await db().query<PlayerRow>(
      `insert into players (display_name, email, consent_at)
       values ($1, $2, now())
       returning *`,
      [displayName, email],
    );
    const row = result.rows[0];
    if (!row) throw new Error('No se pudo crear el jugador.');
    return toPlayer(row);
  },

  async createGameSession({ playerId, seed }) {
    const result = await db().query<SessionRow>(
      `insert into game_sessions (player_id, seed, status)
       values ($1, $2, 'open')
       returning *`,
      [playerId, seed],
    );
    const row = result.rows[0];
    if (!row) throw new Error('No se pudo abrir la partida.');
    return toSession(row);
  },

  async findGameSession(id) {
    const result = await db().query<SessionRow>('select * from game_sessions where id = $1', [id]);
    const row = result.rows[0];
    return row ? toSession(row) : null;
  },

  async closeGameSession(id, status) {
    await db().query('update game_sessions set status = $2, ended_at = now() where id = $1', [
      id,
      status,
    ]);
  },

  async saveScore(input) {
    const result = await db().query<ScoreRow>(
      `insert into scores (session_id, player_id, score, company_name, company_size, company_type, color_counts)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [
        input.sessionId,
        input.playerId,
        input.score,
        input.companyName,
        input.companySize,
        input.companyType,
        JSON.stringify(input.colorCounts),
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error('No se pudo guardar el puntaje.');
    return {
      id: row.id,
      sessionId: row.session_id,
      playerId: row.player_id,
      score: row.score,
      companyName: row.company_name,
      companySize: input.companySize,
      companyType: row.company_type,
      colorCounts: input.colorCounts,
      createdAt: row.created_at.toISOString(),
    };
  },

  async topScores(limit) {
    const result = await db().query<ScoreRow & { posicion: string }>(
      `${RANKED_SCORES_CTE}
       select ranking.*, players.display_name
       from ranking
       join players on players.id = ranking.player_id
       order by posicion
       limit $1`,
      [limit],
    );

    return result.rows.map((row) => ({
      rank: Number(row.posicion),
      playerName: row.display_name ?? 'Jugador',
      companyName: row.company_name,
      companySize: row.company_size as LeaderboardEntry['companySize'],
      companyType: row.company_type,
      score: row.score,
    }));
  },

  async standingFor(playerId): Promise<PlayerStanding | null> {
    const result = await db().query<{ posicion: string; score: number }>(
      `${RANKED_SCORES_CTE}
       select posicion, score from ranking where player_id = $1`,
      [playerId],
    );
    const row = result.rows[0];
    return row ? { rank: Number(row.posicion), bestScore: row.score } : null;
  },
};
