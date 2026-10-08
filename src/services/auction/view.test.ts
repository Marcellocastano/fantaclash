import { describe, it, expect } from 'vitest';
import { deriveAuctionView } from './view';
import {
  AuctionWorld,
  auctionReducer,
  createInitialAuctionState,
} from './session';
import { LOT_DURATION_MS } from './rules';
import { buildRoster, createTestPlayer, createTestTeam } from '../../test/testUtils';
import { AuctionState, Player, Team } from '../../types';

const NOW = 1_000_000;

function makeTeams(): Team[] {
  return [
    createTestTeam({ id: 'me', name: 'Io', isUserTeam: true }),
    createTestTeam({ id: 'b1', name: 'Bot 1' }),
    createTestTeam({ id: 'b2', name: 'Bot 2' }),
  ];
}

function makePool(): Player[] {
  return [
    createTestPlayer({ id: 'p1', role: 'P', baseValue: 30 }),
    createTestPlayer({ id: 'p2', role: 'P', baseValue: 20 }),
    createTestPlayer({ id: 'p3', role: 'P', baseValue: 10 }),
  ];
}

function worldWith(auction: AuctionState, teams = makeTeams()): AuctionWorld {
  return { teams, auction };
}

function startedWorld(order = ['me', 'b1', 'b2']): AuctionWorld {
  const w = worldWith(createInitialAuctionState(makePool()));
  return auctionReducer(w, { type: 'START', callingOrder: order });
}

function biddingWorld(order = ['me', 'b1', 'b2']): AuctionWorld {
  const caller = order[0];
  return auctionReducer(startedWorld(order), {
    type: 'CALL_PLAYER', teamId: caller, playerId: 'p1', now: NOW, seed: 5,
  });
}

describe('deriveAuctionView', () => {
  it('mondo null -> idle, niente lotto, niente squadra utente', () => {
    const v = deriveAuctionView(null, 'me', NOW);
    expect(v.roundState).toBe('idle');
    expect(v.timeRemaining).toBe(0);
    expect(v.isComplete).toBe(false);
    expect(v.currentPlayer).toBeNull();
    expect(v.myTeam).toBeUndefined();
    expect(v.availablePlayers).toEqual([]);
    expect(v.remainingPlayersCount).toBe(0);
  });

  it('fase idle con mondo: utente presente ma nessun turno', () => {
    const v = deriveAuctionView(worldWith(createInitialAuctionState(makePool())), 'me', NOW);
    expect(v.roundState).toBe('idle');
    expect(v.isUserCallingTurn).toBe(false);
    expect(v.myTeam?.id).toBe('me');
  });

  it('calling: turno mio -> roundState calling e isUserCallingTurn', () => {
    const v = deriveAuctionView(startedWorld(), 'me', NOW);
    expect(v.roundState).toBe('calling');
    expect(v.callerId).toBe('me');
    expect(v.isUserCallingTurn).toBe(true);
    expect(v.canSimulateLot).toBe(false);
    // listone del ruolo corrente ordinato per baseValue decrescente
    expect(v.availablePlayers.map(p => p.id)).toEqual(['p1', 'p2', 'p3']);
    expect(v.remainingPlayersCount).toBe(3);
  });

  it('calling: turno di un bot -> bot_calling e lotto simulabile', () => {
    const v = deriveAuctionView(startedWorld(['b1', 'me', 'b2']), 'me', NOW);
    expect(v.roundState).toBe('bot_calling');
    expect(v.callerId).toBe('b1');
    expect(v.isUserCallingTurn).toBe(false);
    expect(v.canSimulateLot).toBe(true);
  });

  it('bidding: rilancio consentito se il ruolo mi serve ancora', () => {
    const v = deriveAuctionView(biddingWorld(), 'me', NOW + 1000);
    expect(v.roundState).toBe('auction_active');
    expect(v.currentPlayer?.id).toBe('p1');
    expect(v.currentBid).toBe(1);
    expect(v.currentBidderId).toBe('me');
    expect(v.canUserBid).toBe(true);
    expect(v.userMaxBid).toBeGreaterThan(0);
    expect(v.timeRemaining).toBe(NOW + LOT_DURATION_MS - (NOW + 1000));
  });

  it('bidding: rilancio vietato se ho già completato il ruolo', () => {
    const full = createTestTeam({
      id: 'me', isUserTeam: true, roster: buildRoster({ P: 1, D: 2, C: 3, A: 2 }),
    });
    const teams = [full, createTestTeam({ id: 'b1' }), createTestTeam({ id: 'b2' })];
    const w = worldWith(createInitialAuctionState(makePool()), teams);
    const started = auctionReducer(w, { type: 'START', callingOrder: ['b1', 'me', 'b2'] });
    const bidding = auctionReducer(started, {
      type: 'CALL_PLAYER', teamId: 'b1', playerId: 'p1', now: NOW, seed: 5,
    });
    const v = deriveAuctionView(bidding, 'me', NOW);
    expect(v.roundState).toBe('auction_active');
    expect(v.canUserBid).toBe(false);
    expect(v.hasUserCompletedCurrentRole).toBe(true);
    expect(v.canSimulateRole).toBe(true);
  });

  it('timeRemaining è 0 dopo la deadline e senza lotto', () => {
    const w = biddingWorld();
    const v = deriveAuctionView(w, 'me', NOW + LOT_DURATION_MS + 500);
    expect(v.timeRemaining).toBe(0);
  });

  it('role_complete e complete si riflettono nel roundState', () => {
    const base = startedWorld();
    const rc = worldWith({ ...base.auction, phase: 'role_complete' }, base.teams);
    expect(deriveAuctionView(rc, 'me', NOW).roundState).toBe('role_complete');
    const done = worldWith({ ...base.auction, phase: 'complete' }, base.teams);
    const v = deriveAuctionView(done, 'me', NOW);
    expect(v.roundState).toBe('auction_complete');
    expect(v.isComplete).toBe(true);
  });

  it('myTeamId null = spettatore: niente turno, niente rilanci', () => {
    const v = deriveAuctionView(startedWorld(), null, NOW);
    expect(v.isUserCallingTurn).toBe(false);
    expect(v.roundState).toBe('bot_calling');
    expect(v.canUserBid).toBe(false);
    expect(v.userMaxBid).toBe(0);
    expect(v.myTeam).toBeUndefined();

    const vb = deriveAuctionView(biddingWorld(), null, NOW);
    expect(vb.roundState).toBe('auction_active');
    expect(vb.canUserBid).toBe(false);
    expect(vb.isUserCallingTurn).toBe(false);
  });
});
