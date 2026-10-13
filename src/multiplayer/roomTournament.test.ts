import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClientSession } from './clientSession';
import { createHostSession } from './hostSession';
import { createMemoryNetwork } from './transport/memory';
import { createRoom, roomReducer } from './roomReducer';
import { stateHash } from './hash';
import { buildDraw, buildLineupWindow, buildRoundRecords, buildStartTournament } from './hostTournament';
import { postAuctionLineupActions } from './testHelpers';
import { createInitialAuctionState, createRng } from '../services/auction';
import { buildRoster, createTestBotConfig, createTestPlayer, createTestTeam } from '../test/testUtils';
import { Player, Team } from '../types';

const CODE = 'ABCDE';
const FULL = { P: 1, D: 4, C: 4, A: 3 } as const;

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

  it('la finestra post-asta chiude il timeout con moduli automatici e avvia il torneo', async () => {
    const net = createMemoryNetwork({ rng: createRng(4), latency: { min: 0, max: 0 }, dropRate: 0 });
    const transport = net.createTransport({ code: CODE, selfId: 'h1', role: 'host' });
    const connected = transport.connect();
    await vi.advanceTimersByTimeAsync(500);
    await connected;
    const lobby = createRoom({
      code: CODE,
      hostId: 'h1',
      host: { nickname: 'Host', teamName: 'Host FC' },
      settings: { season: '2024-25', difficulty: 'normale', format: 'groups' },
      now: Date.now(),
    });
    const state = roomReducer(lobby, {
      type: 'START_AUCTION',
      teams: makeTeams(),
      auction: { ...createInitialAuctionState(makePool()), phase: 'complete' },
    });
    const host = createHostSession({ transport, initialState: state, hostToken: 'tok-h1', now: Date.now });
    const action = buildLineupWindow(state, 'post_auction', Date.now() + 1000)!;
    expect(host.dispatch(action)).toBe(true);
    expect(host.getState().phase).toBe('lineup');
    expect(host.getState().teams.every(team => !team.lineup)).toBe(true);
    await vi.advanceTimersByTimeAsync(1500);
    expect(host.getState().phase).toBe('tournament');
    expect(host.getState().lineupWindow).toBeNull();
    expect(host.getState().tournament?.format).toBe('groups');
    expect(host.getState().teams.every(team => !!team.lineup)).toBe(true);
    await host.destroy();
  });

  it('completa la modalità gironi + fase finale mantenendo gli hash host/client', () => {
    let host = createRoom({
      code: CODE, hostId: 'h1', host: { nickname: 'Host', teamName: 'Host FC' },
      settings: { season: '2024-25', difficulty: 'normale', format: 'groups' }, now: 10,
    });
    host = roomReducer(host, {
      type: 'START_AUCTION', teams: makeTeams(),
      auction: { ...createInitialAuctionState(makePool()), phase: 'complete' },
    });
    let client = host;
    for (const action of postAuctionLineupActions(host)) {
      host = roomReducer(host, action);
      client = roomReducer(client, action);
      expect(stateHash(client)).toBe(stateHash(host));
    }
    host = roomReducer(host, { type: 'START_TOURNAMENT', seed: 741 });
    client = roomReducer(client, { type: 'START_TOURNAMENT', seed: 741 });
    const draw = buildDraw(host, createRng(741))!;
    host = roomReducer(host, draw);
    client = roomReducer(client, draw);
    let guard = 0;
    while (host.tournament?.status !== 'completed' && guard++ < 20) {
      const records = buildRoundRecords(host);
      expect(records.length).toBeGreaterThan(0);
      for (const action of records) {
        host = roomReducer(host, action);
        client = roomReducer(client, action);
        expect(stateHash(client)).toBe(stateHash(host));
      }
    }
    expect(host.tournament?.status).toBe('completed');
    expect(Object.keys(host.tournament?.matches ?? {})).toHaveLength(28);
    expect(stateHash(client)).toBe(stateHash(host));
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

    // Formazioni, torneo, sorteggio, tutti i turni, chiusura
    for (const action of postAuctionLineupActions(host.getState())) expect(host.dispatch(action)).toBe(true);
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

  it('REMATCH riporta tutti in lobby e una seconda asta+torneo funziona', async () => {
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

    // Prima partita completa: asta -> torneo -> final
    host.dispatch({
      type: 'START_AUCTION',
      teams: makeTeams(),
      auction: { ...createInitialAuctionState(makePool()), phase: 'complete' },
    });
    await pump(300);
    for (const action of postAuctionLineupActions(host.getState())) expect(host.dispatch(action)).toBe(true);
    host.dispatch(buildStartTournament());
    await pump(200);
    host.dispatch(buildDraw(host.getState(), createRng(11))!);
    await pump(200);
    let guard = 0;
    while (host.getState().tournament!.status !== 'completed' && guard++ < 10) {
      for (const a of buildRoundRecords(host.getState())) host.dispatch(a);
      await pump(300);
    }
    host.dispatch({ type: 'FINISH' });
    await pump(300);
    expect(host.getState().phase).toBe('final');

    // Rivincita: lobby per tutti, libro delle scelte vuoto
    host.rematch();
    await pump(300);
    expect(host.getState().phase).toBe('lobby');
    expect(client.getState()?.phase).toBe('lobby');
    expect(stateHash(client.getState()!)).toBe(stateHash(host.getState()));
    expect(Object.keys(host.getBook().matchChoices)).toHaveLength(0);
    expect(Object.keys(host.getBook().lineupChoices)).toHaveLength(0);
    expect(client.getState()?.players.every(p => p.teamId === null)).toBe(true);

    // Seconda partita: stesso flusso, client ancora allineato
    host.dispatch({
      type: 'START_AUCTION',
      teams: makeTeams(),
      auction: { ...createInitialAuctionState(makePool()), phase: 'complete' },
    });
    await pump(300);
    expect(host.getState().phase).toBe('auction');
    for (const action of postAuctionLineupActions(host.getState())) expect(host.dispatch(action)).toBe(true);
    host.dispatch(buildStartTournament());
    await pump(200);
    host.dispatch(buildDraw(host.getState(), createRng(13))!);
    await pump(200);
    expect(host.getState().tournament?.status).toBe('quarterfinals');
    guard = 0;
    while (host.getState().tournament!.status !== 'completed' && guard++ < 10) {
      for (const a of buildRoundRecords(host.getState())) host.dispatch(a);
      await pump(300);
    }
    expect(host.getState().tournament?.status).toBe('completed');
    expect(stateHash(client.getState()!)).toBe(stateHash(host.getState()));

    host.destroy();
    client.close();
  });
});
