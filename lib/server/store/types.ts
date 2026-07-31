/**
 * Contrato de persistencia. La app solo conoce esta interfaz; el adaptador
 * concreto (archivo JSON en desarrollo, Postgres en producción) se elige en
 * store/index.ts — INSTRUCCIONES.md §3.1.
 */
import type { ColorCounts, CompanySize } from '@/lib/game/rules';

export interface Player {
  id: string;
  displayName: string;
  /** PRIVADO: nunca debe salir en una respuesta pública (§4.5). */
  email: string;
  /** PRIVADO igual que el correo: identifica a la persona en el Tec (§4.5). */
  matricula: string | null;
  consentAt: string;
  createdAt: string;
}

export type SessionStatus = 'open' | 'closed' | 'rejected';

export interface GameSession {
  id: string;
  playerId: string;
  seed: number;
  startedAt: string;
  endedAt: string | null;
  status: SessionStatus;
}

export interface ScoreRecord {
  id: string;
  sessionId: string;
  playerId: string;
  score: number;
  companyName: string;
  companySize: CompanySize;
  companyType: string;
  colorCounts: ColorCounts;
  createdAt: string;
}

/** Fila del leaderboard: sin correo, sin id de jugador. */
export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  companyName: string;
  companySize: CompanySize;
  companyType: string;
  score: number;
}

export interface PlayerStanding {
  rank: number;
  bestScore: number;
}

export interface Store {
  findPlayerByEmail(email: string): Promise<Player | null>;
  findPlayerById(id: string): Promise<Player | null>;
  createPlayer(input: { displayName: string; email: string; matricula: string }): Promise<Player>;

  createGameSession(input: { playerId: string; seed: number }): Promise<GameSession>;
  findGameSession(id: string): Promise<GameSession | null>;
  closeGameSession(id: string, status: Exclude<SessionStatus, 'open'>): Promise<void>;

  saveScore(input: Omit<ScoreRecord, 'id' | 'createdAt'>): Promise<ScoreRecord>;
  topScores(limit: number): Promise<LeaderboardEntry[]>;
  standingFor(playerId: string): Promise<PlayerStanding | null>;
}
