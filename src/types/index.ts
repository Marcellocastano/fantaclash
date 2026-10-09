import type { TournamentState } from '../domain/tournament/tournamentTypes';

/**
 * Ruoli dei calciatori nel Fantacalcio
 */
export type PlayerRole = 'P' | 'D' | 'C' | 'A';

/**
 * Livelli di difficoltà dei Bot
 */
export type DifficultyLevel = 'normale' | 'difficile';

/**
 * Stati possibili del gioco
 */
export type GamePhase = 'SETUP' | 'ASTA' | 'TORNEO' | 'FINALE';

/**
 * Rappresenta un calciatore nel database
 */
export interface Player {
  /** Identificativo univoco del giocatore */
  id: string;
  /** Nome completo del giocatore */
  name: string;
  /** Ruolo del giocatore (P, D, C, A) */
  role: PlayerRole;
  /** Squadra di Serie A di appartenenza */
  team: string;
  /** Valore base di listino (crediti) */
  baseValue: number;
  /** Media voto storica (4-10) */
  avgRating: number;
  /** Probabilità di gol per partita (0-1) */
  goalProbability: number;
  /** Probabilità di assist per partita (0-1) */
  assistProbability: number;
  /** Probabilità di ammonizione per partita (0-1) */
  yellowCardProbability: number;
  /** Probabilità di espulsione per partita (0-1) */
  redCardProbability: number;
  /** Probabilità di rigore parato (solo portieri, 0-1) */
  penaltySaveProbability?: number;
  /** Probabilità di clean sheet (solo portieri/difensori, 0-1) */
  cleanSheetProbability?: number;
  /** Indice di affidabilità/presenza (0-1) */
  reliability: number;
  /** Stagione di riferimento dei dati (es. '2015-16'); assente per il database di esempio */
  season?: string;
  /** Overall derivato (50-95), solo per dati storici */
  overall?: number;
  /** Statistiche aggregate della stagione, solo per dati storici */
  stats?: {
    appearances: number;
    /** Minuti giocati (non disponibile per tutte le fonti) */
    minutes?: number;
    /** Partite da titolare */
    starts?: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    goalsConceded?: number;
    cleanSheets?: number;
    /** Rigori parati (portieri) */
    penaltiesSaved?: number;
  };
}

/**
 * Rappresenta un giocatore acquistato da una squadra
 */
export interface OwnedPlayer {
  /** Riferimento al giocatore */
  player: Player;
  /** Prezzo di acquisto all'asta */
  purchasePrice: number;
  /** Se il giocatore è titolare nella formazione */
  isStarter: boolean;
  /** Posizione nella formazione (1-8, modulo 1-2-3-2, niente panchina) */
  formationPosition: number;
}

/**
 * Archetipi di comportamento dei bot (personalità d'asta)
 */
export type BotArchetype =
  | 'aggressivo'
  | 'parsimonioso'
  | 'stratega'
  | 'cacciatore'
  | 'equilibrato';

/**
 * Configurazione di una squadra Bot
 */
export interface BotConfig {
  /** Livello di difficoltà del bot */
  difficulty: DifficultyLevel;
  /** Personalità d'asta del bot */
  archetype: BotArchetype;
  /** Preferenze di ruolo centrate su 1 (0.88-1.12) */
  rolePreferences: Record<PlayerRole, number>;
  /** ID dei "pupilli" del bot (solo archetipo cacciatore) */
  pupilli: string[];
}

/**
 * Rappresenta una squadra (utente o bot)
 */
export interface Team {
  /** Identificativo univoco della squadra */
  id: string;
  /** Nome della squadra */
  name: string;
  /** Se è la squadra dell'utente */
  isUserTeam: boolean;
  /** Crediti rimanenti */
  credits: number;
  /** Crediti iniziali */
  initialCredits: number;
  /** Rosa dei giocatori acquistati */
  roster: OwnedPlayer[];
  /** Configurazione bot (null se squadra utente) */
  botConfig: BotConfig | null;
  /**
   * Chi guida la squadra: assente nel gioco singolo (vale isUserTeam),
   * nel multiplayer 'human' = giocatore remoto, 'autopilot' = umano assistito
   */
  controller?: 'human' | 'bot' | 'autopilot';
  /** ID del giocatore remoto proprietario della squadra (multiplayer) */
  ownerId?: string;
}

/**
 * Slot richiesti per completare la rosa
 */
export interface RosterRequirements {
  P: { min: number; max: number; current: number };
  D: { min: number; max: number; current: number };
  C: { min: number; max: number; current: number };
  A: { min: number; max: number; current: number };
}

/**
 * Rappresenta un'offerta durante l'asta
 */
export interface AuctionBid {
  /** ID della squadra che ha fatto l'offerta */
  teamId: string;
  /** Nome della squadra */
  teamName: string;
  /** Importo dell'offerta */
  amount: number;
  /** Timestamp dell'offerta */
  timestamp: number;
}

/**
 * Fasi possibili della macchina a stati dell'asta
 */
export type AuctionPhase =
  | 'idle'           // In attesa di avvio
  | 'calling'        // In attesa che il chiamante scelga un giocatore
  | 'bidding'        // Lotto aperto, rilanci possibili fino alla scadenza
  | 'sold'           // Lotto chiuso e giocatore assegnato, in attesa di conferma
  | 'role_complete'  // Reparto corrente completato, in attesa di continuare
  | 'complete';      // Asta terminata

/**
 * Lotto attualmente all'asta
 */
export interface AuctionLot {
  /** Giocatore chiamato */
  player: Player;
  /** ID della squadra che ha chiamato il giocatore */
  callerId: string;
  /** Offerta corrente più alta */
  currentBid: number;
  /** ID della squadra con l'offerta più alta */
  currentBidderId: string;
  /** Storico delle offerte di questo lotto */
  bidHistory: AuctionBid[];
  /** Scadenza del timer (timestamp ms): ogni rilancio la posticipa */
  deadline: number;
  /** Seme deterministico del lotto (per le decisioni dei bot) */
  seed: number;
}

/**
 * Stato corrente dell'asta
 */
export interface AuctionState {
  /** Fase corrente della macchina a stati */
  phase: AuctionPhase;
  /** Ruolo attualmente all'asta (P -> D -> C -> A) */
  currentRole: PlayerRole | null;
  /** Ordine di chiamata (ID squadre) */
  callingOrder: string[];
  /** Indice del chiamante corrente in callingOrder */
  callerIndex: number;
  /** Lotto attivo (o appena venduto, per la visualizzazione) */
  lot: AuctionLot | null;
  /** Giocatori rimanenti da mettere all'asta */
  remainingPlayers: Player[];
  /** Giocatori già assegnati */
  assignedPlayers: { playerId: string; teamId: string; price: number }[];
  /** Storico completo delle offerte dei lotti chiusi */
  bidHistory: AuctionBid[];
  /** Durata del timer del lotto in ms (default LOT_DURATION_MS) */
  lotDurationMs?: number;
}

/**
 * Configurazione iniziale del gioco
 */
export interface GameConfig {
  /** Nome della squadra dell'utente */
  userTeamName: string;
  /** Livello di difficoltà dei bot */
  difficulty: DifficultyLevel;
  /** Stagione storica da cui caricare i giocatori */
  season: string;
}

/**
 * Stato globale del gioco
 */
export interface GameState {
  /** Fase corrente del gioco */
  phase: GamePhase;
  /** Configurazione del gioco */
  config: GameConfig | null;
  /** Tutte le squadre della lega */
  teams: Team[];
  /** Stato dell'asta */
  auction: AuctionState | null;
  /** Torneo a eliminazione diretta (null fino alla fine dell'asta) */
  tournament: TournamentState | null;
}

/**
 * Requisiti rosa per il formato 1-2-3-2 senza panchina
 */
export const ROSTER_REQUIREMENTS: Record<PlayerRole, { starter: number; bench: number; total: number }> = {
  P: { starter: 1, bench: 0, total: 1 },
  D: { starter: 2, bench: 0, total: 2 },
  C: { starter: 3, bench: 0, total: 3 },
  A: { starter: 2, bench: 0, total: 2 },
};

/**
 * Numero totale di giocatori per rosa
 */
export const TOTAL_ROSTER_SIZE = 8;

/**
 * Bonus/Malus per il calcolo del Fanta-voto
 */
export const FANTASY_BONUSES = {
  GOAL_SCORED: 3,
  ASSIST: 1,
  GOAL_CONCEDED: -1,
  PENALTY_SAVED: 3,
  PENALTY_MISSED: -3,
  YELLOW_CARD: -0.5,
  RED_CARD: -1,
  OWN_GOAL: -2,
  CLEAN_SHEET_GK: 1,
};
