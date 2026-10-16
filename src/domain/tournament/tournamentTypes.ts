import { MatchResult } from '../match/matchTypes';
import type { KitId } from '../teamKits';

/**
 * Tipi del torneo a eliminazione diretta (8 -> 4 -> 2 -> 1).
 * Lo stato è interamente serializzabile e vive in GameState.tournament.
 */

export type TournamentRound = 'quarterfinals' | 'semifinals' | 'final';

/** Formato della coppa: 'double' = quarti e semifinali andata/ritorno */
export type TournamentFormat = 'single' | 'double';

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
  /** Colori sociali (assente nei salvataggi precedenti: fallback deterministico) */
  kit?: KitId;
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
  /** Seme deterministico della partita (andata se ci sono due gare) */
  seed: number;
  /** Seme deterministico del ritorno (solo formato 'double') */
  returnSeed?: number;
  /** Gare del confronto: 1 = gara secca, 2 = andata e ritorno (default 1) */
  legs?: 1 | 2;
  next: BracketLink | null;
  winnerId: string | null;
}

export type TournamentBracket = BracketMatch[];

export interface TournamentState {
  id: string;
  name: string;
  seasonId: string;
  /** Formato della coppa; assente nei salvataggi precedenti = 'single' */
  format?: TournamentFormat;
  userTeamId: string;
  teams: TournamentTeam[];
  bracket: TournamentBracket;
  /** Partita che l'utente sta giocando (schermata partita aperta) */
  currentMatchId: string | null;
  /**
   * Risultati per gara: la chiave è l'id del tie per l'andata (o la gara
   * secca) e `${id}-R` per il ritorno del formato 'double'.
   */
  matches: Record<string, MatchResult>;
  status: TournamentStatus;
  winnerId: string | null;
}

export type TournamentAction =
  | { type: 'DRAW'; order: string[] }
  | { type: 'START_MATCH'; matchId: string }
  | { type: 'LEAVE_MATCH' }
  | { type: 'RECORD_RESULT'; matchId: string; result: MatchResult };
