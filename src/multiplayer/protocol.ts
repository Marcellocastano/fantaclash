import { AuctionState, DifficultyLevel, Team } from '../types';
import { AuctionAction } from '../services/auction';
import { TournamentAction, TournamentState } from '../domain/tournament';
import { MatchOptions } from '../domain/match';

/**
 * Protocollo della stanza multiplayer (host autorevole).
 *
 * I client mandano INTENTI; l'host li traduce in RoomAction numerate
 * (rev) e le trasmette; tutti applicano le stesse azioni allo stesso
 * roomReducer puro. RoomState è trasmesso per intero (SNAPSHOT):
 * niente segreti dentro — i token stanno nell'HostBook dell'host.
 */

export type RoomPhase = 'lobby' | 'auction' | 'tournament' | 'final';

export interface RoomSettings {
  season: string;
  difficulty: DifficultyLevel;
  /** true: gli slot liberi vanno a bot; false: servono 8 umani */
  fillWithBots: boolean;
}

export interface RoomPlayer {
  id: string;
  nickname: string;
  teamName: string;
  ready: boolean;
  connected: boolean;
  joinedAt: number;
  /** Squadra assegnata a START_AUCTION (null in lobby) */
  teamId: string | null;
}

export interface RoomState {
  protocol: number;
  code: string;
  /** Numero di revisione: l'ultima azione applicata */
  rev: number;
  phase: RoomPhase;
  hostId: string;
  settings: RoomSettings;
  /** Solo giocatori (max 8), in ordine di ingresso; niente spettatori */
  players: RoomPlayer[];
  teams: Team[];
  auction: AuctionState | null;
  tournament: TournamentState | null;
  /** Scadenza del turno di chiamata di un umano (host clock), null se assente */
  callDeadline: number | null;
}

export type RoomAction =
  | { type: 'PLAYER_JOINED'; player: RoomPlayer }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'PLAYER_CONNECTION'; playerId: string; connected: boolean }
  | { type: 'PLAYER_READY'; playerId: string; ready: boolean }
  | { type: 'PLAYER_KICKED'; playerId: string }
  | { type: 'SETTINGS'; settings: Partial<RoomSettings> }
  | { type: 'START_AUCTION'; teams: Team[]; auction: AuctionState }
  | { type: 'AUCTION'; action: AuctionAction }
  | { type: 'CALL_DEADLINE'; deadline: number | null }
  | { type: 'START_TOURNAMENT'; seed: number }
  | { type: 'TOURNAMENT'; action: Exclude<TournamentAction, { type: 'RECORD_RESULT' }> }
  | { type: 'MATCH_RECORD'; matchId: string; seed: number; options: MatchOptions; resultHash: string }
  | { type: 'FINISH' };

export type ClientIntent =
  | { type: 'HELLO'; playerId: string; token: string; nickname: string; teamName: string; protocol: number; role: 'player' | 'spectator' }
  | { type: 'READY'; ready: boolean }
  | { type: 'CALL'; footballerId: string }
  | { type: 'BID'; amount: number }
  | { type: 'PING'; t: number }
  | { type: 'RESYNC'; fromRev: number };

export type RejectReason = 'protocol' | 'full' | 'started' | 'kicked' | 'bad_token' | 'invalid';

export type HostMessage =
  | { type: 'ACTION'; rev: number; action: RoomAction; hostNow: number }
  | { type: 'SNAPSHOT'; rev: number; state: RoomState; hash: string; hostNow: number; to?: string }
  | { type: 'HASH'; rev: number; hash: string }
  | { type: 'LISTENING'; to: string }
  | { type: 'PONG'; to: string; t: number; hostNow: number }
  | { type: 'REJECT'; to: string; reason: RejectReason };

/** Busta di trasporto: la firma arriverà in F7 */
export interface Envelope<M> {
  from: string;
  msg: M;
}

const CLIENT_INTENT_TYPES: readonly ClientIntent['type'][] = [
  'HELLO', 'READY', 'CALL', 'BID', 'PING', 'RESYNC',
];

const HOST_MESSAGE_TYPES: readonly HostMessage['type'][] = [
  'ACTION', 'SNAPSHOT', 'HASH', 'PONG', 'REJECT', 'LISTENING',
];

const ROOM_ACTION_TYPES: readonly RoomAction['type'][] = [
  'PLAYER_JOINED', 'PLAYER_LEFT', 'PLAYER_CONNECTION', 'PLAYER_READY',
  'PLAYER_KICKED', 'SETTINGS', 'START_AUCTION', 'AUCTION', 'CALL_DEADLINE',
  'START_TOURNAMENT', 'TOURNAMENT', 'MATCH_RECORD', 'FINISH',
];

/** Guard minimo sulla forma del messaggio (type noto) */
export function isClientIntent(v: unknown): v is ClientIntent {
  return (
    typeof v === 'object' && v !== null &&
    CLIENT_INTENT_TYPES.includes((v as { type: ClientIntent['type'] }).type)
  );
}

/** Guard minimo sulla forma del messaggio host (type noto) */
export function isHostMessage(v: unknown): v is HostMessage {
  return (
    typeof v === 'object' && v !== null &&
    HOST_MESSAGE_TYPES.includes((v as { type: HostMessage['type'] }).type)
  );
}

/** Guard minimo sulla forma dell'azione (type noto) */
export function isRoomAction(v: unknown): v is RoomAction {
  return (
    typeof v === 'object' && v !== null &&
    ROOM_ACTION_TYPES.includes((v as { type: RoomAction['type'] }).type)
  );
}
