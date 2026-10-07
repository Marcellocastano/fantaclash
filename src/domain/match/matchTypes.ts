import { Player, PlayerRole } from '../../types';

/**
 * Tipi del motore partita. Tutto è serializzabile (JSON) così un
 * MatchResult può essere salvato, riprodotto e ripetuto.
 */

/** Lato del campo */
export type MatchSide = 'home' | 'away';

/** Atteggiamento tattico scelto (dall'utente o dall'IA dei bot) */
export type Tactic = 'attacca' | 'equilibrata' | 'difendi';

/** Squadra in ingresso al motore: 8 titolari, modulo 1-2-3-2 */
export interface MatchTeamInput {
  id: string;
  name: string;
  players: Player[];
}

/** Cambio di atteggiamento a partire da un tick (incluso) */
export interface TacticChange {
  fromTick: number;
  tactic: Tactic;
}

/** Opzioni della simulazione */
export interface MatchOptions {
  /**
   * Piano tattico per lato. Un lato senza piano è guidato dall'IA
   * (cambia atteggiamento ai punti di decisione in base al punteggio).
   */
  tactics?: Partial<Record<MatchSide, TacticChange[]>>;
  /** Vantaggio casalingo (default HOME_ADVANTAGE) */
  homeAdvantage?: number;
  /**
   * Ordine dei rigoristi per lato (id giocatore). Un lato senza ordine usa
   * quello automatico: movimento per qualità decrescente, portiere ultimo.
   * Influisce solo sulla lotteria (Rng separato): i 90' non cambiano.
   */
  shootoutOrder?: Partial<Record<MatchSide, string[]>>;
}

/** Giocatore schierato, con la forma del giorno (fotografia per la UI) */
export interface LineupPlayer {
  playerId: string;
  name: string;
  role: PlayerRole;
  club: string;
  overall: number;
  /** Moltiplicatore di forma della partita (0.90 - 1.10) */
  form: number;
}

/** Tipo di occasione */
export type ChanceKind = 'normale' | 'grande' | 'contropiede';

export type MatchEventType =
  | 'kickoff'
  | 'chance'
  | 'goal'
  | 'assist'
  | 'save'
  | 'miss'
  | 'woodwork'
  | 'penalty'
  | 'penalty_missed'
  | 'own_goal'
  | 'yellow_card'
  | 'red_card'
  | 'injury'
  | 'tactic'
  | 'half_time'
  | 'full_time'
  | 'shootout_start'
  | 'shootout_kick';

/**
 * Evento della partita.
 * - teamId: squadra a cui l'evento "appartiene" (per goal/own_goal è la
 *   squadra che segna; per own_goal playerId è il difensore avversario).
 * - impact: rilevanza per la UI (0-3: 3 = gol/espulsione, animazione forte).
 */
export interface MatchEvent {
  id: string;
  tick: number;
  minute: number;
  /** Minuti di recupero (45+2 -> minute 45, extra 2) */
  extra: number;
  type: MatchEventType;
  teamId: string;
  side: MatchSide;
  playerId?: string;
  relatedPlayerId?: string;
  impact: number;
  description: string;
  /** Dettagli opzionali */
  chanceKind?: ChanceKind;
  isPenalty?: boolean;
  secondYellow?: boolean;
  tactic?: Tactic;
  /** Esito di un rigore della lotteria finale */
  scored?: boolean;
  /** Punteggio dopo l'evento (solo goal/own_goal/shootout_kick) */
  score?: { home: number; away: number };
}

/** Istantanea dello stato a fine tick: alimenta clock, indicatore, energia */
export interface MatchTick {
  index: number;
  period: 1 | 2;
  minute: number;
  extra: number;
  /** Inerzia -1 (ospiti) .. +1 (casa): da possesso, momentum, occasioni */
  pressure: number;
  /**
   * Posizione del pallone lungo il campo, continua da -1 a +1
   * (+1 = porta ospite, cioè casa all'attacco; 0 = centrocampo;
   * ±0.7..0.9 area di rigore; ±1 gol). Vedi matchBall.ts.
   */
  ball: number;
  /** Controllo del gioco della squadra di casa (0-1) in questo tick */
  homeControl: number;
  energy: Record<MatchSide, number>;
  tactic: Record<MatchSide, Tactic>;
}

/** Statistiche di squadra */
export interface TeamMatchStats {
  possession: number;
  chances: number;
  bigChances: number;
  shots: number;
  shotsOnTarget: number;
  yellowCards: number;
  redCards: number;
}

/** Prestazione individuale (stile fantacalcio: voto + bonus/malus) */
export interface MatchPlayerPerformance {
  playerId: string;
  teamId: string;
  side: MatchSide;
  name: string;
  role: PlayerRole;
  /** Voto in pagella (4 - 9, a mezzi punti) */
  rating: number;
  /** Somma di bonus e malus */
  bonus: number;
  /** Fantavoto = rating + bonus */
  fantasyScore: number;
  goals: number;
  assists: number;
  saves: number;
  goalsConceded: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  ownGoals: number;
  yellowCards: number;
  redCards: number;
  injured: boolean;
  cleanSheet: boolean;
}

/** Componenti leggibili della forza di squadra */
export interface TeamProfile {
  /** Forza complessiva pesata per ruolo, in scala overall (50-100) */
  rating: number;
  /** Reparti normalizzati 0-1.4 (dopo forma e sinergia) */
  gk: number;
  def: number;
  mid: number;
  att: number;
  /** Moltiplicatore di sinergia (0.97 - 1.05) */
  synergy: number;
  /** Club rappresentato da più giocatori (intesa), se presente */
  chemistryClub: string | null;
  chemistryCount: number;
}

/** Lotteria dei rigori */
export interface ShootoutResult {
  home: number;
  away: number;
}

export interface MatchResult {
  seed: number;
  homeTeamId: string;
  awayTeamId: string;
  homeName: string;
  awayName: string;
  /** Gol nei tempi regolamentari */
  homeScore: number;
  awayScore: number;
  shootout: ShootoutResult | null;
  /**
   * Ordine effettivo dei rigoristi (solo giocatori in campo), se si è
   * andati ai rigori. Opzionale: i risultati salvati prima non lo hanno.
   */
  shootoutOrder?: Record<MatchSide, string[]> | null;
  winnerId: string;
  events: MatchEvent[];
  ticks: MatchTick[];
  /** Tick in cui l'utente/IA può cambiare atteggiamento */
  decisionTicks: number[];
  /** Ultimo tick del primo tempo e dei regolamentari (dopo: rigori) */
  halfTimeTick: number;
  fullTimeTick: number;
  lineups: Record<MatchSide, LineupPlayer[]>;
  profiles: Record<MatchSide, TeamProfile>;
  stats: Record<MatchSide, TeamMatchStats>;
  /** Somma dei fantavoti della squadra */
  teamPerformance: Record<MatchSide, number>;
  playerPerformances: MatchPlayerPerformance[];
  mvpId: string;
  worstId: string;
}
