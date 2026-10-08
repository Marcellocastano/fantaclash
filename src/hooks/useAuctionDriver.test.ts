import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAuctionDriver, UseAuctionDriverOptions } from './useAuctionDriver';
import {
  AuctionAction,
  AuctionWorld,
  auctionReducer,
  createInitialAuctionState,
} from '../services/auction';
import {
  buildRoster,
  createTestBotConfig,
  createTestPlayer,
  createTestTeam,
} from '../test/testUtils';
import { Player, Team } from '../types';

const NOW = 1_000_000;

function makePool(): Player[] {
  return [
    createTestPlayer({ id: 'p1', role: 'P', baseValue: 40 }),
    createTestPlayer({ id: 'p2', role: 'P', baseValue: 20 }),
  ];
}

/** Utente + due bot veri (con botConfig, altrimenti non decidono nulla) */
function makeTeams(botOverrides: Partial<Team> = {}): Team[] {
  return [
    createTestTeam({ id: 'me', isUserTeam: true }),
    createTestTeam({ id: 'b1', botConfig: createTestBotConfig(), ...botOverrides }),
    createTestTeam({ id: 'b2', botConfig: createTestBotConfig(), ...botOverrides }),
  ];
}

function startedWorld(teams = makeTeams()): AuctionWorld {
  const w: AuctionWorld = { teams, auction: createInitialAuctionState(makePool()) };
  return auctionReducer(w, { type: 'START', callingOrder: ['b1', 'me', 'b2'] });
}

/** Mondo in fase bidding: il lotto lo apre 'me' su p1 */
function biddingWorld(teams = makeTeams()): AuctionWorld {
  const started = auctionReducer(
    { teams, auction: createInitialAuctionState(makePool()) },
    { type: 'START', callingOrder: ['me', 'b1', 'b2'] }
  );
  return auctionReducer(started, {
    type: 'CALL_PLAYER', teamId: 'me', playerId: 'p1', now: Date.now(), seed: 5,
  });
}

/**
 * Monta il driver su un mondo mutabile: dispatchAction applica il reducer
 * e step() fa avanzare i fake timer e ri-renderizza col mondo aggiornato.
 */
function setup(
  initialWorld: AuctionWorld,
  enabled = true,
  opts: Partial<UseAuctionDriverOptions> = {}
) {
  let world = initialWorld;
  const actions: AuctionAction[] = [];
  const dispatchAction = (a: AuctionAction): boolean => {
    const next = auctionReducer(world, a);
    if (next === world) return false;
    world = next;
    actions.push(a);
    return true;
  };
  const hook = renderHook(
    ({ w, en }) => useAuctionDriver({ world: w, dispatchAction, enabled: en, ...opts }),
    { initialProps: { w: world, en: enabled } }
  );
  const step = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
    hook.rerender({ w: world, en: enabled });
  };
  return { actions, step, getWorld: () => world, dispatchAction };
}

describe('useAuctionDriver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    // rng deterministico: ritardi e scelte dei bot a metà del loro range
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('un bot chiamante esegue CALL_PLAYER dopo il ritardo pianificato', () => {
    const { actions, step, getWorld } = setup(startedWorld());
    // 'equilibrato' chiama in 1000-2000 ms: entro 5 s deve aver chiamato
    for (let i = 0; i < 10 && getWorld().auction.phase !== 'bidding'; i++) step(500);
    const calls = actions.filter(a => a.type === 'CALL_PLAYER');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ teamId: 'b1' });
    expect(getWorld().auction.phase).toBe('bidding');
    expect(getWorld().auction.lot?.callerId).toBe('b1');
  });

  it('il lotto si chiude alla deadline quando nessuno rilancia', () => {
    // Rose complete: nessun bot ha bisogno del ruolo -> nessun rilancio
    const fullRoster = buildRoster({ P: 1, D: 2, C: 3, A: 2 });
    const bots = makeTeams({ roster: fullRoster });
    const { actions, step, getWorld } = setup(biddingWorld(bots));
    for (let i = 0; i < 60 && getWorld().auction.phase !== 'sold'; i++) step(100);
    expect(actions.some(a => a.type === 'CLOSE_LOT')).toBe(true);
    expect(getWorld().auction.phase).toBe('sold');
    expect(getWorld().auction.lot?.currentBidderId).toBe('me');
  });

  it('un rilancio bot pianificato viene eseguito come BID', () => {
    // Rose vuote e giocatore di valore: almeno un bot vuole rilanciare
    const { actions, step } = setup(biddingWorld());
    for (let i = 0; i < 60 && !actions.some(a => a.type === 'BID'); i++) step(100);
    const bids = actions.filter(a => a.type === 'BID');
    expect(bids.length).toBeGreaterThan(0);
    expect(['b1', 'b2']).toContain(bids[0].type === 'BID' ? bids[0].teamId : '');
  });

  it('con enabled=false non succede nulla', () => {
    const { actions, step, getWorld } = setup(startedWorld(), false);
    for (let i = 0; i < 40; i++) step(500);
    expect(actions).toHaveLength(0);
    expect(getWorld().auction.phase).toBe('calling');
  });

  // ------------------------------------------------------------------
  // Opzioni multiplayer (punto 2 del brief F4)
  // ------------------------------------------------------------------

  it('closeGraceMs ritarda la chiusura del lotto oltre la deadline', () => {
    const fullRoster = buildRoster({ P: 1, D: 2, C: 3, A: 2 });
    const { actions, step, getWorld } = setup(biddingWorld(makeTeams({ roster: fullRoster })), true, {
      closeGraceMs: 500,
    });
    const deadline = getWorld().auction.lot!.deadline;

    // Arriva alla deadline: il lotto NON si chiude ancora per la grazia
    step(deadline - Date.now());
    expect(getWorld().auction.phase).toBe('bidding');
    expect(actions.some(a => a.type === 'CLOSE_LOT')).toBe(false);

    // Dopo la tolleranza si chiude, con now reale (>= deadline + grazia)
    step(600);
    expect(getWorld().auction.phase).toBe('sold');
    const close = actions.find(a => a.type === 'CLOSE_LOT');
    expect(close?.type === 'CLOSE_LOT' && close.now >= deadline + 500).toBe(true);
  });

  it('autoAdvance.soldMs dispatcha ADVANCE dopo la vendita', () => {
    // Pool [P, C], 'me' senza P né C, bot a rosa piena: venduto p1 il reparto P si chiude
    const pool = [
      createTestPlayer({ id: 'p1', role: 'P', baseValue: 40 }),
      createTestPlayer({ id: 'c1', role: 'C', baseValue: 30 }),
    ];
    const teams = makeTeams({ roster: buildRoster({ P: 1, D: 2, C: 3, A: 2 }) });
    teams[0] = { ...teams[0], roster: buildRoster({ D: 2, A: 2 }) };
    let w: AuctionWorld = { teams, auction: createInitialAuctionState(pool) };
    w = auctionReducer(w, { type: 'START', callingOrder: ['me', 'b1', 'b2'] });
    w = auctionReducer(w, { type: 'CALL_PLAYER', teamId: 'me', playerId: 'p1', now: Date.now(), seed: 5 });
    const { actions, step, getWorld } = setup(w, true, { autoAdvance: { soldMs: 2000, roleMs: 3000 } });

    for (let i = 0; i < 60 && getWorld().auction.phase !== 'sold'; i++) step(100);
    expect(getWorld().auction.phase).toBe('sold');

    step(1900);
    expect(actions.some(a => a.type === 'ADVANCE')).toBe(false);
    step(200);
    expect(actions.some(a => a.type === 'ADVANCE')).toBe(true);
    // P esaurito per tutti -> reparto chiuso
    expect(getWorld().auction.phase).toBe('role_complete');
  });

  it('autoAdvance.roleMs dispatcha CONTINUE a reparto chiuso', () => {
    const pool = [
      createTestPlayer({ id: 'p1', role: 'P', baseValue: 40 }),
      createTestPlayer({ id: 'c1', role: 'C', baseValue: 30 }),
    ];
    const teams = makeTeams({ roster: buildRoster({ P: 1, D: 2, C: 3, A: 2 }) });
    teams[0] = { ...teams[0], roster: buildRoster({ D: 2, A: 2 }) };
    let w: AuctionWorld = { teams, auction: createInitialAuctionState(pool) };
    w = auctionReducer(w, { type: 'START', callingOrder: ['me', 'b1', 'b2'] });
    w = auctionReducer(w, { type: 'CALL_PLAYER', teamId: 'me', playerId: 'p1', now: Date.now(), seed: 5 });
    const { actions, step, getWorld } = setup(w, true, { autoAdvance: { soldMs: 1000, roleMs: 3000 } });

    // Vendita + ADVANCE automatico -> role_complete
    for (let i = 0; i < 80 && getWorld().auction.phase !== 'role_complete'; i++) step(100);
    expect(getWorld().auction.phase).toBe('role_complete');
    expect(actions.some(a => a.type === 'ADVANCE')).toBe(true);

    step(2900);
    expect(actions.some(a => a.type === 'CONTINUE')).toBe(false);
    step(200);
    expect(actions.some(a => a.type === 'CONTINUE')).toBe(true);
    expect(getWorld().auction.phase).toBe('calling');
  });

  it('umanCallTimeoutMs: notifica la deadline e chiama da solo allo scadere', () => {
    const onHumanCallTurn = vi.fn();
    // 'me' è umano (con botConfig, come nelle stanze) e primo a chiamare
    const teams = makeTeams();
    teams[0] = { ...teams[0], botConfig: createTestBotConfig() };
    const { actions, step, getWorld } = setup(
      auctionReducer(
        { teams, auction: createInitialAuctionState(makePool()) },
        { type: 'START', callingOrder: ['me', 'b1', 'b2'] }
      ),
      true,
      { humanCallTimeoutMs: 1000, onHumanCallTurn }
    );
    expect(getWorld().auction.phase).toBe('calling');
    expect(onHumanCallTurn).toHaveBeenLastCalledWith(expect.any(Number));
    const deadline = onHumanCallTurn.mock.calls[onHumanCallTurn.mock.calls.length - 1][0] as number;
    expect(deadline).toBe(Date.now() + 1000);

    step(1100);
    const calls = actions.filter(a => a.type === 'CALL_PLAYER');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ teamId: 'me' });
    expect(onHumanCallTurn).toHaveBeenLastCalledWith(null);
  });

  it('se l\'umano chiama prima del timeout, la chiamata automatica decade', () => {
    const onHumanCallTurn = vi.fn();
    const teams = makeTeams();
    teams[0] = { ...teams[0], botConfig: createTestBotConfig() };
    const { actions, step, getWorld, dispatchAction } = setup(
      auctionReducer(
        { teams, auction: createInitialAuctionState(makePool()) },
        { type: 'START', callingOrder: ['me', 'b1', 'b2'] }
      ),
      true,
      { humanCallTimeoutMs: 1000, onHumanCallTurn }
    );
    // L'umano chiama subito p1
    act(() => {
      dispatchAction({
        type: 'CALL_PLAYER', teamId: 'me', playerId: 'p1', now: Date.now(), seed: 7,
      });
    });
    step(1100);
    expect(getWorld().auction.phase).toBe('bidding');
    expect(actions.filter(a => a.type === 'CALL_PLAYER')).toHaveLength(1);
    expect(onHumanCallTurn).toHaveBeenLastCalledWith(null);
  });
});
