import { LEAGUE_SIZE } from '../services/auction';
import { MAX_TEAM_NAME_LENGTH } from '../mock/teamNames';

/**
 * Costanti del protocollo multiplayer (host autorevole).
 */

/** Versione del protocollo: client e host devono concordare */
export const PROTOCOL_VERSION = 1;

/** Giocatori umani massimi in stanza (uno per squadra) */
export const MAX_PLAYERS = LEAGUE_SIZE;

/** Minimo di umani per avviare l'asta */
export const MIN_HUMANS = 2;

/** Tolleranza oltre la deadline del lotto per un rilancio in viaggio */
export const BID_GRACE_MS = 300;

/** Tempo massimo per la chiamata di un giocatore umano */
export const CALL_TIMEOUT_MS = 25000;

/** Cadenza del PING di liveness */
export const PING_INTERVAL_MS = 2000;

/** Silenzio oltre il quale un giocatore è marcato assente */
export const ABSENT_AFTER_MS = 6000;

/** Spettatori massimi (non entrano in RoomState.players) */
export const MAX_SPECTATORS = 15;

/** Lunghezza massima del nickname */
export const NICKNAME_MAX = 20;

/** Lunghezza massima del nome squadra (stessa del form singolo) */
export const TEAM_NAME_MAX = MAX_TEAM_NAME_LENGTH;
