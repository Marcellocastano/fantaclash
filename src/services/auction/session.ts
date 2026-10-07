import {
  AuctionBid,
  AuctionState,
  OwnedPlayer,
  Player,
  PlayerRole,
  Team,
} from '../../types';
import {
  LOT_DURATION_MS,
  OPENING_BID,
  ROLE_ORDER,
  canBid,
  getCurrentRole,
  getNextCallerIndex,
} from './rules';

/**
 * Macchina a stati pura dell'asta.
 *
 * Ogni azione produce un nuovo AuctionWorld; le azioni non valide
 * restituiscono la STESSA referenza di `world`, così i chiamanti
 * possono rilevare il rifiuto con un confronto `===`.
 */

/**
 * Azioni accettate dalla macchina a stati
 */
export type AuctionAction =
  | { type: 'START'; callingOrder: string[] }
  | { type: 'CALL_PLAYER'; teamId: string; playerId: string; now: number; seed: number }
  | { type: 'BID'; teamId: string; amount: number; now: number }
  | { type: 'CLOSE_LOT'; now: number }
  | { type: 'ADVANCE' }
  | { type: 'CONTINUE' };

/**
 * Mondo dell'asta: squadre (con crediti e rose) + stato dell'asta
 */
export interface AuctionWorld {
  teams: Team[];
  auction: AuctionState;
}

/**
 * Crea lo stato iniziale dell'asta (fase 'idle').
 * Il ruolo iniziale è il primo ruolo presente nel pool secondo ROLE_ORDER.
 */
export function createInitialAuctionState(players: Player[]): AuctionState {
  const rolesPresent = new Set(players.map(p => p.role));
  const currentRole = ROLE_ORDER.find(role => rolesPresent.has(role)) ?? null;
  return {
    phase: 'idle',
    currentRole,
    callingOrder: [],
    callerIndex: -1,
    lot: null,
    remainingPlayers: [...players],
    assignedPlayers: [],
    bidHistory: [],
  };
}

/**
 * ID della squadra che deve chiamare, o null se non determinabile
 */
export function getCurrentCallerId(auction: AuctionState): string | null {
  if (auction.callerIndex < 0) return null;
  return auction.callingOrder[auction.callerIndex] ?? null;
}

function findTeam(teams: Team[], id: string): Team | undefined {
  return teams.find(t => t.id === id);
}

/** Squadre nell'ordine di chiamata (undefined se un ID non esiste più) */
function orderedTeams(auction: AuctionState, teams: Team[]): (Team | undefined)[] {
  return auction.callingOrder.map(id => findTeam(teams, id));
}

function withAuction(world: AuctionWorld, auction: Partial<AuctionState>): AuctionWorld {
  return { ...world, auction: { ...world.auction, ...auction } };
}

/**
 * Riduttore puro dell'asta. Azioni non valide -> stessa referenza di world.
 */
export function auctionReducer(world: AuctionWorld, action: AuctionAction): AuctionWorld {
  const { auction, teams } = world;

  switch (action.type) {
    case 'START': {
      if (auction.phase !== 'idle') return world;
      const role = getCurrentRole(teams, auction.remainingPlayers);
      if (role === null) {
        return withAuction(world, {
          phase: 'complete',
          currentRole: null,
          callingOrder: action.callingOrder,
        });
      }
      const order = action.callingOrder.map(id => findTeam(teams, id));
      const callerIndex = getNextCallerIndex(order, -1, role);
      if (callerIndex === -1) {
        return withAuction(world, {
          phase: 'complete',
          currentRole: null,
          callingOrder: action.callingOrder,
        });
      }
      return withAuction(world, {
        phase: 'calling',
        currentRole: role,
        callingOrder: action.callingOrder,
        callerIndex,
      });
    }

    case 'CALL_PLAYER': {
      if (auction.phase !== 'calling') return world;
      if (getCurrentCallerId(auction) !== action.teamId) return world;
      const caller = findTeam(teams, action.teamId);
      const player = auction.remainingPlayers.find(p => p.id === action.playerId);
      if (!caller || !player || player.role !== auction.currentRole) return world;
      if (!canBid(caller, player, OPENING_BID)) return world;

      const openingBid: AuctionBid = {
        teamId: caller.id,
        teamName: caller.name,
        amount: OPENING_BID,
        timestamp: action.now,
      };
      return withAuction(world, {
        phase: 'bidding',
        lot: {
          player,
          callerId: caller.id,
          currentBid: OPENING_BID,
          currentBidderId: caller.id,
          bidHistory: [openingBid],
          deadline: action.now + LOT_DURATION_MS,
          seed: action.seed,
        },
      });
    }

    case 'BID': {
      if (auction.phase !== 'bidding' || !auction.lot) return world;
      const lot = auction.lot;
      if (action.teamId === lot.currentBidderId) return world;
      if (action.amount <= lot.currentBid) return world;
      if (action.now > lot.deadline) return world;
      const team = findTeam(teams, action.teamId);
      if (!team || !canBid(team, lot.player, action.amount)) return world;

      const bid: AuctionBid = {
        teamId: team.id,
        teamName: team.name,
        amount: action.amount,
        timestamp: action.now,
      };
      return withAuction(world, {
        lot: {
          ...lot,
          currentBid: action.amount,
          currentBidderId: team.id,
          bidHistory: [...lot.bidHistory, bid],
          deadline: action.now + LOT_DURATION_MS,
        },
      });
    }

    case 'CLOSE_LOT': {
      if (auction.phase !== 'bidding' || !auction.lot) return world;
      if (action.now < auction.lot.deadline) return world;

      const lot = auction.lot;
      const winner = findTeam(teams, lot.currentBidderId);
      if (!winner) return world;

      const owned: OwnedPlayer = {
        player: lot.player,
        purchasePrice: lot.currentBid,
        isStarter: false,
        formationPosition: winner.roster.length + 1,
      };
      const updatedWinner: Team = {
        ...winner,
        credits: winner.credits - lot.currentBid,
        roster: [...winner.roster, owned],
      };
      const newTeams = teams.map(t => (t.id === winner.id ? updatedWinner : t));

      return {
        teams: newTeams,
        auction: {
          ...auction,
          phase: 'sold',
          remainingPlayers: auction.remainingPlayers.filter(p => p.id !== lot.player.id),
          assignedPlayers: [
            ...auction.assignedPlayers,
            { playerId: lot.player.id, teamId: winner.id, price: lot.currentBid },
          ],
          bidHistory: [...auction.bidHistory, ...lot.bidHistory],
        },
      };
    }

    case 'ADVANCE': {
      if (auction.phase !== 'sold') return world;
      const role = getCurrentRole(teams, auction.remainingPlayers);
      if (role === null) {
        return withAuction(world, { phase: 'complete', currentRole: null, lot: null });
      }
      if (role !== auction.currentRole) {
        // Rotazione continua: callerIndex NON viene resettato
        return withAuction(world, { phase: 'role_complete', currentRole: role, lot: null });
      }
      const order = orderedTeams(auction, teams);
      const nextIndex = getNextCallerIndex(order, auction.callerIndex, role);
      if (nextIndex === -1) {
        return withAuction(world, { phase: 'complete', currentRole: null, lot: null });
      }
      return withAuction(world, { phase: 'calling', callerIndex: nextIndex, lot: null });
    }

    case 'CONTINUE': {
      if (auction.phase !== 'role_complete' || !auction.currentRole) return world;
      const role: PlayerRole = auction.currentRole;
      const order = orderedTeams(auction, teams);
      const nextIndex = getNextCallerIndex(order, auction.callerIndex, role);
      if (nextIndex === -1) {
        return withAuction(world, { phase: 'complete', currentRole: null });
      }
      return withAuction(world, { phase: 'calling', callerIndex: nextIndex });
    }

    default:
      return world;
  }
}
