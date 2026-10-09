import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createClientSession } from './clientSession';
import { createHostSession } from './hostSession';
import { createMemoryNetwork } from './transport/memory';
import { createRoom } from './roomReducer';
import { stateHash } from './hash';
import { useAuctionDriver } from '../hooks/useAuctionDriver';
import { intervalTick } from './clock/tick';
import { createRng, createInitialAuctionState, getCurrentCallerId } from '../services/auction';
import { buildRoster, createTestBotConfig, createTestPlayer, createTestTeam } from '../test/testUtils';
import { BID_GRACE_MS, CALL_TIMEOUT_MS } from './constants';
import { Player, Team } from '../types';

const T0 = 1_000_000;
const CODE = 'ABCDE';
const FULL = { P: 1, D: 2, C: 3, A: 2 } as const;

function makePool(): Player[] {
  return [
    createTestPlayer({ id: 'p1', role: 'P', baseValue: 40 }),
    createTestPlayer({ id: 'p2', role: 'P', baseValue: 30 }),
    createTestPlayer({ id: 'p3', role: 'P', baseValue: 20 }),
  ];
}

/** 2 umani (rosa vuota) + 6 bot a rosa piena: solo gli umani agiscono */
function makeTeams(): Team[] {
  const human = (id: string, ownerId: string): Team =>
    createTestTeam({
      id, name: `Team ${id}`, credits: 500, roster: [],
      controller: 'human', ownerId, botConfig: createTestBotConfig(),
    });
  const bot = (id: string): Team =>
    createTestTeam({
      id, name: `Bot ${id}`, roster: buildRoster(FULL),
      controller: 'bot', botConfig: createTestBotConfig(),
    });
  return [human('th', 'h1'), human('tc', 'c1'), ...[1, 2, 3, 4, 5, 6].map(i => bot(`b${i}`))];
}

describe('asta live di stanza (host driver + client)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('rilancio del client (anche entro la grazia), chiusura, auto-advance, timeout umano', async () => {
    const net = createMemoryNetwork({ rng: createRng(7), latency: { min: 20, max: 60 }, dropRate: 0 });
    const pump = (ms: number) => vi.advanceTimersByTimeAsync(ms);
    const step = async (ms: number) => {
      await act(async () => { await pump(ms); });
      hook.rerender();
    };

    const initial = createRoom({
      code: CODE, hostId: 'h1',
      host: { nickname: 'Host', teamName: 'Host FC' },
      settings: { season: '2024-25', difficulty: 'normale' },
      now: Date.now(),
    });
    const hostTransport = net.createTransport({ code: CODE, selfId: 'h1', role: 'host' });
    const hc = hostTransport.connect();
    await pump(500);
    await hc;
    const host = createHostSession({
      transport: hostTransport, initialState: initial, hostToken: 'tok-h1', rng: createRng(9),
    });

    const clientTransport = net.createTransport({ code: CODE, selfId: 'c1', role: 'player' });
    const client = createClientSession({
      transport: clientTransport,
      identity: { participantId: 'c1', token: 'tok-c1' },
      role: 'player', nickname: 'Guest', teamName: 'Guest FC',
    });
    const cp = client.connect();
    for (let i = 0; i < 80 && client.getStatus() !== 'ready'; i++) await pump(200);
    await cp;
    expect(client.getStatus()).toBe('ready');

    // Asta con le squadre controllate (bot sazi: solo gli umani giocano)
    host.dispatch({
      type: 'START_AUCTION',
      teams: makeTeams(),
      auction: createInitialAuctionState(makePool()),
    });
    host.dispatch({
      type: 'AUCTION',
      action: { type: 'START', callingOrder: ['th', 'tc', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6'] },
    });

    // Driver autorevole dell'host (come useRoomHostDriver, ma tick finto)
    const world = () => {
      const s = host.getState();
      return s.auction ? { teams: s.teams, auction: s.auction } : null;
    };
    const hook = renderHook(() =>
      useAuctionDriver({
        world: world(),
        dispatchAction: a => host.dispatch({ type: 'AUCTION', action: a }),
        enabled: true,
        tick: intervalTick,
        closeGraceMs: BID_GRACE_MS,
        autoAdvance: { soldMs: 2000, roleMs: 3000 },
        humanCallTimeoutMs: CALL_TIMEOUT_MS,
        onHumanCallTurn: d => { host.dispatch({ type: 'CALL_DEADLINE', deadline: d }); },
      })
    );
    host.subscribe(() => { void 0; });
    await step(300);

    // Il turno di chiamata dell'host (umano): scadenza pubblicata sui client
    expect(getCurrentCallerId(host.getState().auction!)).toBe('th');
    expect(host.getState().callDeadline).not.toBeNull();
    const deadline1 = host.getState().callDeadline!;
    await step(300);
    expect(client.getState()?.callDeadline).toBe(deadline1);

    // L'host non chiama: allo scadere il driver chiama al posto suo
    await step(CALL_TIMEOUT_MS + 500);
    expect(host.getState().auction!.phase).toBe('bidding');
    expect(host.getState().auction!.lot!.callerId).toBe('th');
    expect(host.getState().callDeadline).toBeNull();
    await step(300);
    expect(client.getState()?.auction?.phase).toBe('bidding');
    // Rilancio del client via intento -> accettato e propagato
    client.sendIntent({ type: 'BID', amount: 5 });
    await step(400);
    expect(host.getState().auction!.lot!.currentBidderId).toBe('tc');
    expect(client.getState()?.auction?.lot?.currentBidderId).toBe('tc');
    const deadline2 = host.getState().auction!.lot!.deadline;

    // Rilancio dell'host in viaggio a deadline + 200ms (entro la grazia):
    // non può rilanciare di nuovo il client, che è già in testa
    await step(deadline2 + 200 - Date.now());
    host.submitLocal({ type: 'BID', amount: 8 });
    await step(300);
    const lotAfterGrace = host.getState().auction!.lot!;
    expect(lotAfterGrace.currentBid).toBe(8);
    expect(lotAfterGrace.currentBidderId).toBe('th');
    expect(client.getState()?.auction?.lot?.currentBidderId).toBe('th');
    const deadline3 = lotAfterGrace.deadline;
    expect(deadline3).toBeGreaterThan(deadline2);

    // Senza altri rilanci il lotto NON chiude alla deadline ma dopo la grazia
    await step(deadline3 - Date.now() + 100); // ~deadline3 + 100
    expect(host.getState().auction!.phase).toBe('bidding');
    await step(BID_GRACE_MS + 300);
    expect(host.getState().auction!.phase).toBe('sold');
    expect(host.getState().teams.find(t => t.id === 'th')!.roster).toHaveLength(1);

    // Avanzamento automatico dopo la vendita (soldMs)
    await step(2200);
    const phase = host.getState().auction!.phase;
    expect(['calling', 'role_complete', 'complete']).toContain(phase);
    expect(phase).not.toBe('sold');

    // Qualche altro lotto/turno per stabilizzare la propagazione
    for (let i = 0; i < 40; i++) await step(500);
    await step(2000);

    // Convergenza finale: stesso hash host/client
    expect(stateHash(client.getState()!)).toBe(stateHash(host.getState()));
    await host.destroy();
    await client.close();
  });
});
