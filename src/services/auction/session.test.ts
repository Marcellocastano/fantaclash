import { describe, it, expect } from 'vitest';
import {
  AuctionWorld,
  auctionReducer,
  createInitialAuctionState,
  getCurrentCallerId,
} from './session';
import { LOT_DURATION_MS } from './rules';
import { buildRoster, createTestPlayer, createTestTeam } from '../../test/testUtils';
import { Player, Team } from '../../types';

const NOW = 1_000_000;

function makeTeams(): Team[] {
  return [
    createTestTeam({ id: 't0', name: 'T0', isUserTeam: true }),
    createTestTeam({ id: 't1', name: 'T1' }),
    createTestTeam({ id: 't2', name: 'T2' }),
  ];
}

function makePool(): Player[] {
  return [
    createTestPlayer({ id: 'p1', role: 'P', baseValue: 30 }),
    createTestPlayer({ id: 'p2', role: 'P', baseValue: 20 }),
    createTestPlayer({ id: 'p3', role: 'P', baseValue: 10 }),
    createTestPlayer({ id: 'd1', role: 'D', baseValue: 25 }),
  ];
}

function startedWorld(): AuctionWorld {
  const world: AuctionWorld = {
    teams: makeTeams(),
    auction: createInitialAuctionState(makePool()),
  };
  return auctionReducer(world, { type: 'START', callingOrder: ['t0', 't1', 't2'] });
}

describe('session reducer', () => {
  it('START apre in fase calling con il primo chiamante valido', () => {
    const world = startedWorld();
    expect(world.auction.phase).toBe('calling');
    expect(world.auction.currentRole).toBe('P');
    expect(world.auction.callerIndex).toBe(0);
    expect(getCurrentCallerId(world.auction)).toBe('t0');
  });

  it('START va direttamente a complete se nessun ruolo è giocabile', () => {
    const teams = makeTeams().map(t => ({ ...t, roster: buildRoster({ P: 1, D: 2, C: 3, A: 2 }) }));
    const world: AuctionWorld = { teams, auction: createInitialAuctionState(makePool()) };
    const next = auctionReducer(world, { type: 'START', callingOrder: ['t0', 't1', 't2'] });
    expect(next.auction.phase).toBe('complete');
  });

  it('azioni su fase sbagliata restituiscono la stessa referenza', () => {
    const world = startedWorld();
    expect(auctionReducer(world, { type: 'START', callingOrder: [] })).toBe(world);
    expect(auctionReducer(world, { type: 'ADVANCE' })).toBe(world);
    expect(auctionReducer(world, { type: 'CONTINUE' })).toBe(world);
    expect(auctionReducer(world, { type: 'CLOSE_LOT', now: NOW })).toBe(world);
  });

  it('CALL_PLAYER rifiuta chiamante sbagliato, ruolo sbagliato, giocatore assente', () => {
    const world = startedWorld();
    const base = { type: 'CALL_PLAYER' as const, now: NOW, seed: 1 };
    expect(auctionReducer(world, { ...base, teamId: 't1', playerId: 'p1' })).toBe(world);
    expect(auctionReducer(world, { ...base, teamId: 't0', playerId: 'd1' })).toBe(world);
    expect(auctionReducer(world, { ...base, teamId: 't0', playerId: 'nope' })).toBe(world);
  });

  it('CALL_PLAYER valida apre il lotto a 1 con scadenza e seme', () => {
    const world = startedWorld();
    const next = auctionReducer(world, {
      type: 'CALL_PLAYER', teamId: 't0', playerId: 'p2', now: NOW, seed: 77,
    });
    expect(next.auction.phase).toBe('bidding');
    const lot = next.auction.lot!;
    expect(lot.player.id).toBe('p2');
    expect(lot.currentBid).toBe(1);
    expect(lot.currentBidderId).toBe('t0');
    expect(lot.deadline).toBe(NOW + LOT_DURATION_MS);
    expect(lot.seed).toBe(77);
    expect(lot.bidHistory).toHaveLength(1);
  });

  function biddingWorld() {
    return auctionReducer(startedWorld(), {
      type: 'CALL_PLAYER', teamId: 't0', playerId: 'p1', now: NOW, seed: 5,
    });
  }

  it('BID rifiuta: stesso offerente, offerta non superiore, oltre scadenza, budget', () => {
    const world = biddingWorld();
    const lot = world.auction.lot!;
    // stesso offerente
    expect(auctionReducer(world, { type: 'BID', teamId: 't0', amount: 5, now: NOW })).toBe(world);
    // offerta non superiore
    expect(auctionReducer(world, { type: 'BID', teamId: 't1', amount: 1, now: NOW })).toBe(world);
    // oltre scadenza
    expect(auctionReducer(world, { type: 'BID', teamId: 't1', amount: 5, now: lot.deadline + 1 })).toBe(world);
    // oltre il massimo (t1 ha 500 crediti e 8 slot -> max 493)
    expect(auctionReducer(world, { type: 'BID', teamId: 't1', amount: 494, now: NOW })).toBe(world);
    // squadra inesistente
    expect(auctionReducer(world, { type: 'BID', teamId: 'ghost', amount: 5, now: NOW })).toBe(world);
  });

  it('BID valido aggiorna offerta, bidder, storia e resetta la scadenza', () => {
    const world = biddingWorld();
    const t = NOW + 2000;
    const next = auctionReducer(world, { type: 'BID', teamId: 't1', amount: 10, now: t });
    const lot = next.auction.lot!;
    expect(lot.currentBid).toBe(10);
    expect(lot.currentBidderId).toBe('t1');
    expect(lot.bidHistory).toHaveLength(2);
    expect(lot.deadline).toBe(t + LOT_DURATION_MS);
  });

  it('CLOSE_LOT prima della scadenza è ignorato', () => {
    const world = biddingWorld();
    expect(auctionReducer(world, { type: 'CLOSE_LOT', now: NOW + LOT_DURATION_MS - 1 })).toBe(world);
  });

  it('CLOSE_LOT assegna: crediti, rosa, pool, assignedPlayers, bidHistory', () => {
    let world = biddingWorld();
    world = auctionReducer(world, { type: 'BID', teamId: 't2', amount: 33, now: NOW + 100 });
    const deadline = world.auction.lot!.deadline;
    const next = auctionReducer(world, { type: 'CLOSE_LOT', now: deadline });

    expect(next.auction.phase).toBe('sold');
    const winner = next.teams.find(t => t.id === 't2')!;
    expect(winner.credits).toBe(500 - 33);
    expect(winner.roster).toHaveLength(1);
    expect(winner.roster[0].player.id).toBe('p1');
    expect(winner.roster[0].purchasePrice).toBe(33);
    expect(next.auction.remainingPlayers.map(p => p.id)).not.toContain('p1');
    expect(next.auction.assignedPlayers).toEqual([{ playerId: 'p1', teamId: 't2', price: 33 }]);
    expect(next.auction.bidHistory).toHaveLength(2);
    // il lotto resta disponibile per la UI
    expect(next.auction.lot?.player.id).toBe('p1');

    // invariante crediti + prezzi
    const spent = next.auction.assignedPlayers.reduce((s, a) => s + a.price, 0);
    const credits = next.teams.reduce((s, t) => s + t.credits, 0);
    expect(credits + spent).toBe(1500);
  });

  it('ADVANCE passa al prossimo chiamante saltando chi ha finito', () => {
    let world = biddingWorld();
    const deadline = world.auction.lot!.deadline;
    world = auctionReducer(world, { type: 'CLOSE_LOT', now: deadline });
    const next = auctionReducer(world, { type: 'ADVANCE' });
    expect(next.auction.phase).toBe('calling');
    expect(next.auction.lot).toBeNull();
    expect(next.auction.callerIndex).toBe(1); // t0 -> t1
  });

  it('ADVANCE con cambio ruolo va in role_complete mantenendo callerIndex', () => {
    // t0 completa i P, poi viene assegnato l\'ultimo P a t2
    const teams = makeTeams().map(t =>
      t.id === 't0' ? { ...t, roster: buildRoster({ P: 1 }) } : t
    );
    const pool = [createTestPlayer({ id: 'pl', role: 'P', baseValue: 9 }), ...makePool().filter(p => p.role === 'D')];
    let world: AuctionWorld = { teams, auction: createInitialAuctionState(pool) };
    world = auctionReducer(world, { type: 'START', callingOrder: ['t0', 't1', 't2'] });
    // chiamante corrente: t1 (t0 non necessita P)
    expect(getCurrentCallerId(world.auction)).toBe('t1');
    world = auctionReducer(world, { type: 'CALL_PLAYER', teamId: 't1', playerId: 'pl', now: NOW, seed: 1 });
    world = auctionReducer(world, { type: 'CLOSE_LOT', now: NOW + LOT_DURATION_MS });
    const next = auctionReducer(world, { type: 'ADVANCE' });
    // I P sono finiti nel pool: si passa a D con role_complete
    expect(next.auction.phase).toBe('role_complete');
    expect(next.auction.currentRole).toBe('D');
    expect(next.auction.callerIndex).toBe(world.auction.callerIndex);
  });

  it('CONTINUE riprende la chiamata con rotazione continua', () => {
    const teams = makeTeams().map(t =>
      t.id === 't0' ? { ...t, roster: buildRoster({ P: 1 }) } : t
    );
    const pool = [createTestPlayer({ id: 'pl', role: 'P', baseValue: 9 }), ...makePool().filter(p => p.role === 'D')];
    let world: AuctionWorld = { teams, auction: createInitialAuctionState(pool) };
    world = auctionReducer(world, { type: 'START', callingOrder: ['t0', 't1', 't2'] });
    world = auctionReducer(world, { type: 'CALL_PLAYER', teamId: 't1', playerId: 'pl', now: NOW, seed: 1 });
    world = auctionReducer(world, { type: 'CLOSE_LOT', now: NOW + LOT_DURATION_MS });
    world = auctionReducer(world, { type: 'ADVANCE' });
    const next = auctionReducer(world, { type: 'CONTINUE' });
    expect(next.auction.phase).toBe('calling');
    // Da indice 1 (t1) il prossimo che necessita D è t2
    expect(next.auction.callerIndex).toBe(2);
  });

  it('ADVANCE a fine asta va in complete', () => {
    const teams = makeTeams().map(t => ({
      ...t,
      roster: buildRoster({ D: 2, C: 3, A: 2 }), // manca solo 1 P a ciascuno
    }));
    // Pool con 2 soli P: dopo il secondo il pool P è vuoto e tutti hanno finito... no:
    // con 2 P e 3 squadre serve che una resti scoperta; usiamo 3 P.
    const pool = [
      createTestPlayer({ id: 'pa', role: 'P' }),
      createTestPlayer({ id: 'pb', role: 'P' }),
      createTestPlayer({ id: 'pc', role: 'P' }),
    ];
    let world: AuctionWorld = { teams, auction: createInitialAuctionState(pool) };
    world = auctionReducer(world, { type: 'START', callingOrder: ['t0', 't1', 't2'] });
    for (const pid of ['pa', 'pb', 'pc']) {
      const caller = getCurrentCallerId(world.auction)!;
      world = auctionReducer(world, { type: 'CALL_PLAYER', teamId: caller, playerId: pid, now: NOW, seed: 1 });
      world = auctionReducer(world, { type: 'CLOSE_LOT', now: NOW + LOT_DURATION_MS });
      world = auctionReducer(world, { type: 'ADVANCE' });
    }
    expect(world.auction.phase).toBe('complete');
  });
});
