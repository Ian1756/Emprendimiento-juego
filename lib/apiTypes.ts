/** Contratos de las respuestas de API compartidos por cliente y servidor. */
import type { CompanyResult } from './game/company';
import type { Intentos } from './game/intentos';
import type { LeaderboardEntry, PlayerStanding } from './server/store/types';

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  standing: PlayerStanding | null;
  intentos: Intentos;
}

export interface StartSessionResponse {
  sessionId: string;
  seed: number;
  intentos: Intentos;
}

export interface SubmitScoreResponse {
  score: number;
  colorCounts: number[];
  company: CompanyResult;
  leaderboard: LeaderboardEntry[];
  standing: PlayerStanding | null;
  intentos: Intentos;
  madeTopFive: boolean;
}

export interface ApiError {
  error: string;
}
