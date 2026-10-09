import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClientSession } from './clientSession';
import { createHostSession } from './hostSession';
import { createMemoryNetwork } from './transport/memory';
import { createRoom } from './roomReducer';
import { stateHash } from './hash';
import { buildDraw, buildRoundRecords, buildStartTournament } from './hostTournament';
import { createInitialAuctionState, createRng } from '../services/auction';
import { buildRoster, createTestBotConfig, createTestPlayer, createTestTeam } from '../test/testUtils';
import { Player, Team } from '../types';

const CODE = 'ABCDE';
const FULL = { P: 1, D: 2, C: 3, A: 2 } as const;

function makePool(): Player[] {
  return [createTestPlayer({ id: 'p1', role: 'P', baseValue: 40 })];
}

/** 8 squadre a rosa piena: 2 umani (host + client) e 6 bot */
function makeTeams(): Team[] {
  const mk = (id: string, name: string, ownerId: string | null): Team =>
    createTestTeam({
      id, name, roster: buildRoster(FULL),
      controller: ownerId ? 'human' : 'bot',
      ownerId: ownerId ?? undefined,
      botConfig: createTestBotConfig(),
    });
  return [
    mk('th', 'Host FC', 'h1'),
    mk('tc', 'Guest FC', 'c1'),
    ...[1, 2, 3, 4, 5, 6].map(i => mk(`b${i}`, `Bot ${i}`, null)),
  ];
}

describe('torneo di stanza (host autorevole su rete in memoria)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('START_TOURNAMENT -> DRAW -> turni -> FINISH: client sempre allineato', async () => {
    const net = createMemoryNetwork({ rng: createRng(7), latency: { min: 20, max: 60 }, dropRate: 0 });
    const pump = (ms: number) => vi.advanceTimersByTimeAsync(ms);

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

    const client = createClientSession({
      transport: net.createTransport({ code: CODE, selfId: 'c1', role: 'player' }),
      identity: { participantId: 'c1', token: 'tok-c1' },
      role: 'player', nickname: 'Guest', teamName: 'Guest FC',
    });
    const cp = client.connect();
    for (let i = 0; i < 80 && client.getStatus() !== 'ready'; i++) await pump(200);
    await cp;
    expect(client.getStatus()).toBe('ready');
    expect(stateHash(client.getState()!)).toBe(stateHash(host.getState()));

    // Asta completata in un colpo solo (helper coerente coi test esistenti)
    host.dispatch({
      type: 'START_AUCTION',
      teams: makeTeams(),
      auction: { ...createInitialAuctionState(makePool()), phase: 'complete' },
    });
    await pump(300);
    expect(host.getState().auction?.phase).toBe('complete');
    expect(stateHash(client.getState()!)).toBe(stateHash(host.getState()));

    // Torneo: avvio, sorteggio, tutti i turni, chiusura
    host.dispatch(buildStartTournament());
    await pump(200);
    host.dispatch(buildDraw(host.getState(), createRng(11))!);
    await pump(200);
    expect(host.getState().tournament?.status).toBe('quarterfinals');
    expect(stateHash(client.getState()!)).toBe(stateHash(host.getState()));

    let guard = 0;
    while (host.getState().tournament!.status !== 'completed' && guard++ < 10) {
      const records = buildRoundRecords(host.getState());
      expect(records.length).toBeGreaterThan(0);
      for (const a of records) expect(host.dispatch(a)).toBe(true);
      await pump(300);
      expect(stateHash(client.getState()!)).toBe(stateHash(host.getState()));
    }
    expect(host.getState().tournament?.status).toBe('completed');

    expect(host.dispatch({ type: 'FINISH' })).toBe(true);
    await pump(300);
    expect(host.getState().phase).toBe('final');
    expect(client.getState()?.phase).toBe('final');
    expect(stateHash(client.getState()!)).toBe(stateHash(host.getState()));

    host.destroy();
    client.close();
  });
});
