import { MatchResult } from '../match/matchTypes';

/**
 * Tipi del torneo a eliminazione diretta (8 -> 4 -> 2 -> 1).
 * Lo stato è interamente serializzabile e vive in GameState.tournament.
 */

export type TournamentRound = 'quarterfinals' | 'semifinals' | 'final';

export type TournamentStatus = 'draw' | 'quarterfinals' | 'semifinals' | 'final' | 'completed';

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
  winnerId: string | null;
}

export type TournamentBracket = BracketMatch[];

export interface TournamentState {
  id: string;
  name: string;
  seasonId: string;
  userTeamId: string;
  teams: TournamentTeam[];
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
