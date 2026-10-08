import { AuctionBid, Player, PlayerRole, Team } from '../../types';
import { getCurrentCallerId, AuctionWorld } from './session';
import { getLotDuration, getMaxBid, needsRole } from './rules';

/**
 * Vista pura dell'asta: tutti i campi derivati che la UI legge, calcolati
 * a partire dal mondo. "Utente" è la squadra con id === myTeamId
 * (null = spettatore: niente turno di chiamata né rilanci).
 */

/** Stati dell'asta esposti alla UI */
export type AuctionRoundState =
  | 'idle'              // In attesa di avviare
  | 'calling'           // Turno di chiamata utente
  | 'bot_calling'       // Un bot sta scegliendo il giocatore
  | 'auction_active'    // Asta in corso con timer
  | 'sold'              // Giocatore venduto
  | 'role_complete'     // Reparto completato
  | 'auction_complete'; // Asta terminata

/** Campi derivati dell'asta, pronti per la UI */
export interface AuctionView {
  roundState: AuctionRoundState;
  currentRole: PlayerRole;
  currentPlayer: Player | null;
  currentBid: number;
  currentBidderId: string | null;
  bidHistory: AuctionBid[];
  callerId: string | null;
  /** ms rimanenti alla deadline del lotto (0 se nessun lotto) */
  timeRemaining: number;
  isUserCallingTurn: boolean;
  /** Giocatori del reparto corrente, per baseValue decrescente */
  availablePlayers: Player[];
  remainingPlayers: Player[];
  remainingPlayersCount: number;
  isComplete: boolean;
  canUserBid: boolean;
  userMaxBid: number;
  hasUserCompletedCurrentRole: boolean;
  canSimulateLot: boolean;
  canSimulateRole: boolean;
  /** La squadra dell'utente (myTeamId) nel mondo, se presente */
  myTeam: Team | undefined;
}

export function deriveAuctionView(
  world: AuctionWorld | null,
  myTeamId: string | null,
  now: number
): AuctionView {
  const auction = world?.auction ?? null;
  const teams = world?.teams ?? [];
  const lot = auction?.lot ?? null;

  const callerId = auction ? getCurrentCallerId(auction) : null;
  const myTeam = myTeamId ? teams.find(t => t.id === myTeamId) : undefined;
  const caller = callerId ? teams.find(t => t.id === callerId) : undefined;
  const isUserCallingTurn = !!caller && !!myTeam && caller.id === myTeam.id;

  const phase = auction?.phase ?? 'idle';
  const roundState: AuctionRoundState =
    phase === 'calling'
      ? isUserCallingTurn ? 'calling' : 'bot_calling'
      : phase === 'bidding'
        ? 'auction_active'
        : phase === 'complete'
          ? 'auction_complete'
          : phase;

  const currentRole: PlayerRole = auction?.currentRole ?? 'P';

  const availablePlayers: Player[] = auction
    ? auction.remainingPlayers
        .filter(p => p.role === currentRole)
        .sort((a, b) => b.baseValue - a.baseValue)
    : [];

  const canUserBid =
    !!myTeam && !!lot && phase === 'bidding' && needsRole(myTeam, lot.player.role);

  const userMaxBid = myTeam ? getMaxBid(myTeam) : 0;

  const hasUserCompletedCurrentRole =
    !!myTeam && !!auction?.currentRole && !needsRole(myTeam, auction.currentRole);

  // Il lotto è simulabile se è aperto o se un bot deve ancora chiamare
  const canSimulateLot = phase === 'bidding' || (phase === 'calling' && !isUserCallingTurn);
  // Il reparto è simulabile solo se l'utente lo ha completato
  const canSimulateRole =
    hasUserCompletedCurrentRole && (phase === 'calling' || phase === 'bidding' || phase === 'sold');

  return {
    roundState,
    currentRole,
    currentPlayer: lot?.player ?? null,
    currentBid: lot?.currentBid ?? 0,
    currentBidderId: lot?.currentBidderId ?? null,
    bidHistory: lot?.bidHistory ?? [],
    callerId,
    timeRemaining: lot && auction ? Math.min(getLotDuration(auction), Math.max(0, lot.deadline - now)) : 0,
    isUserCallingTurn,
    availablePlayers,
    remainingPlayers: auction?.remainingPlayers ?? [],
    remainingPlayersCount: auction?.remainingPlayers.length ?? 0,
    isComplete: phase === 'complete',
    canUserBid,
    userMaxBid,
    hasUserCompletedCurrentRole,
    canSimulateLot,
    canSimulateRole,
    myTeam,
  };
}
