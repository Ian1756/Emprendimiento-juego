/**
 * Adaptador de persistencia en archivo JSON. Pensado para desarrollo y para
 * eventos de un solo servidor. En producción con varias instancias se usa el
 * adaptador de Postgres — INSTRUCCIONES.md §3.
 */
import 'server-only';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { serverEnv } from '../env';
import type { GameSession, Player, ScoreRecord, SessionStatus, Store } from './types';

interface Database {
  players: Player[];
  sessions: GameSession[];
  scores: ScoreRecord[];
}

const EMPTY_DATABASE: Database = { players: [], sessions: [], scores: [] };

let cache: Database | null = null;
let pendingWrite: Promise<void> = Promise.resolve();

function filePath(): string {
  return resolve(process.cwd(), serverEnv.dataFile);
}

async function load(): Promise<Database> {
  if (cache) return cache;

  try {
    const raw = await readFile(filePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<Database>;
    cache = {
      players: parsed.players ?? [],
      sessions: parsed.sessions ?? [],
      scores: parsed.scores ?? [],
    };
  } catch {
    // Primer arranque: todavía no existe el archivo.
    cache = { ...EMPTY_DATABASE };
  }

  return cache;
}

/** Las escrituras se encadenan para que dos peticiones no se pisen el archivo. */
async function persist(database: Database): Promise<void> {
  pendingWrite = pendingWrite.then(async () => {
    const path = filePath();
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(database, null, 2), 'utf8');
  });
  await pendingWrite;
}

function bestScorePerPlayer(scores: ScoreRecord[]): ScoreRecord[] {
  const best = new Map<string, ScoreRecord>();

  for (const score of scores) {
    const current = best.get(score.playerId);
    if (!current || score.score > current.score) best.set(score.playerId, score);
  }

  // Empate: gana quien lo logró primero (§3.1).
  return [...best.values()].sort(
    (a, b) => b.score - a.score || Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
}

export const fileStore: Store = {
  async findPlayerByEmail(email) {
    const database = await load();
    const buscado = email.toLowerCase();
    return database.players.find((player) => player.email.toLowerCase() === buscado) ?? null;
  },

  async findPlayerById(id) {
    const database = await load();
    return database.players.find((player) => player.id === id) ?? null;
  },

  async createPlayer({ displayName, email }) {
    const database = await load();
    const now = new Date().toISOString();
    const player: Player = { id: randomUUID(), displayName, email, consentAt: now, createdAt: now };
    database.players.push(player);
    await persist(database);
    return player;
  },

  async createGameSession({ playerId, seed }) {
    const database = await load();
    const session: GameSession = {
      id: randomUUID(),
      playerId,
      seed,
      startedAt: new Date().toISOString(),
      endedAt: null,
      status: 'open',
    };
    database.sessions.push(session);
    await persist(database);
    return session;
  },

  async findGameSession(id) {
    const database = await load();
    return database.sessions.find((session) => session.id === id) ?? null;
  },

  async closeGameSession(id, status: Exclude<SessionStatus, 'open'>) {
    const database = await load();
    const session = database.sessions.find((item) => item.id === id);
    if (!session) return;
    session.status = status;
    session.endedAt = new Date().toISOString();
    await persist(database);
  },

  async saveScore(input) {
    const database = await load();
    const record: ScoreRecord = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    database.scores.push(record);
    await persist(database);
    return record;
  },

  async topScores(limit) {
    const database = await load();
    const ranked = bestScorePerPlayer(database.scores).slice(0, limit);

    return ranked.map((score, position) => {
      const player = database.players.find((item) => item.id === score.playerId);
      return {
        rank: position + 1,
        playerName: player?.displayName ?? 'Jugador',
        companyName: score.companyName,
        companySize: score.companySize,
        companyType: score.companyType,
        score: score.score,
      };
    });
  },

  async standingFor(playerId) {
    const database = await load();
    const ranked = bestScorePerPlayer(database.scores);
    const position = ranked.findIndex((score) => score.playerId === playerId);
    if (position === -1) return null;
    return { rank: position + 1, bestScore: ranked[position]?.score ?? 0 };
  },
};
