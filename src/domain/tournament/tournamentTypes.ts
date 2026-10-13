import type { CompetitionFormat } from '../../types/index.js';
import type { MatchResult } from '../match/matchTypes.js';

/**
 * Tipi condivisi dai formati knockout e gironi + fase finale.
 * Lo stato è interamente serializzabile e vive in GameState.tournament.
 */

export type TournamentRound = 'quarterfinals' | 'semifinals' | 'final' | 'third_place';

export type TournamentStatus = 'draw' | 'groups' | 'quarterfinals' | 'semifinals' | 'final' | 'completed';

/** Stato di una partita del tabellone */
export type BracketMatchStatus = 'upcoming' | 'ready' | 'in_progress' | 'completed';

/** Esito di una squadra in una partita */
export type TeamOutcome = 'winner' | 'eliminated' | 'pending';

export interface TournamentTeam {
  id: string;
  name: string;
  isUserTeam: boolean;
  /** Forza da tabellone (scala overall) */
  rating: number;
  /** Sigla per l'avatar (2 lettere) */
  monogram: string;
}

/** Slot del tabellone verso cui avanza il vincitore */
export interface BracketLink {
  matchId: string;
  slot: 'home' | 'away';
}

export interface BracketMatch {
  id: string;
  round: TournamentRound;
  /** Posizione nel turno (0-based, dall'alto) */
  index: number;
  homeId: string | null;
  awayId: string | null;
  /** Seme deterministico della partita */
  seed: number;
  next: BracketLink | null;
  loserNext?: BracketLink | null;
  winnerId: string | null;
}

export interface GroupFixture {
  id: string;
  group: 'A' | 'B';
  matchday: number;
  leg: 'andata' | 'ritorno';
  homeId: string;
  awayId: string;
  seed: number;
}

export interface GroupStage {
  groups: { A: string[]; B: string[] };
  fixtures: GroupFixture[];
}

export interface GroupStanding {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
  status: 'qualified' | 'contention' | 'eliminated';
}

export type TournamentBracket = BracketMatch[];

export interface TournamentState {
  id: string;
  name: string;
  format: CompetitionFormat;
  seasonId: string;
  userTeamId: string;
  teams: TournamentTeam[];
  groups: GroupStage | null;
  bracket: TournamentBracket;
  /** Partita che l'utente sta giocando (schermata partita aperta) */
  currentMatchId: string | null;
  matches: Record<string, MatchResult>;
  status: TournamentStatus;
  winnerId: string | null;
}

export type TournamentAction =
  | { type: 'DRAW'; order: string[] }
  | { type: 'START_MATCH'; matchId: string }
  | { type: 'LEAVE_MATCH' }
  | { type: 'RECORD_RESULT'; matchId: string; result: MatchResult };
