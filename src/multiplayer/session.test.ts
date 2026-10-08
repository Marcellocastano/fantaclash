import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClientSession, ClientSession } from './clientSession';
import { createHostSession, HostSession } from './hostSession';
import { createMemoryNetwork } from './transport/memory';
import { createRoom } from './roomReducer';
import { stateHash } from './hash';
import { RoomState } from './protocol';
import { createRng, getCurrentCallerId, ROLE_ORDER } from '../services/auction';
import { createTestPlayer } from '../test/testUtils';
import { Player, PlayerRole } from '../types';
import { ABSENT_AFTER_MS, MAX_SPECTATORS } from './constants';

const T0 = 1_000_000;
const CODE = 'ABCDE';

function makePool(): Player[] {
  const counts: Record<PlayerRole, number> = { P: 12, D: 24, C: 36, A: 24 };
  const pool: Player[] = [];
  for (const role of ROLE_ORDER) {
    for (let i = 0; i < counts[role]; i++) {
      pool.push(createTestPlayer({ id: `${role}${i}`, role, baseValue: 40 - (i % 20) }));
    }
  }
  return pool;
}

let now = T0;
const tickNow = (ms = 100) => (now += ms);

/** Prossima azione d'asta che fa avanzare il mondo (come in simulation.test.ts) */
function nextAuctionAction(state: RoomState) {
  const a = state.auction!;
  switch (a.phase) {
    case 'calling': {
      const callerId = getCurrentCallerId(a)!;
      const player = a.remainingPlayers.find(p => p.role === a.currentRole)!;
      return { type: 'CALL_PLAYER' as const, teamId: callerId, playerId: player.id, now: tickNow(500), seed: 1 };
    }
    case 'bidding':
      return { type: 'CLOSE_LOT' as const, now: a.lot!.deadline };
    case 'sold':
      return { type: 'ADVANCE' as const };
    case 'role_complete':
      return { type: 'CONTINUE' as const };
    default:
      return null;
  }
}

async function makeNetwork(opts: { dropRate?: number } = {}) {
  const net = createMemoryNetwork({
    rng: createRng(42),
    latency: { min: 20, max: 200 },
    dropRate: opts.dropRate ?? 0,
  });
  const pump = (ms = 50) => vi.advanceTimersByTimeAsync(ms);
  const initial = createRoom({
    code: CODE, hostId: 'h1',
    host: { nickname: 'Host', teamName: 'Host FC' },
    settings: { season: '2024-25', difficulty: 'normale', fillWithBots: true },
    now: Date.now(),
  });
  const hostTransport = net.createTransport({ code: CODE, selfId: 'h1', role: 'host' });
  const hc = hostTransport.connect();
  await vi.advanceTimersByTimeAsync(500);
  await hc;
  const host: HostSession = createHostSession({
    transport: hostTransport, initialState: initial, hostToken: 'tok-h1', rng: createRng(9),
  });
  const clients: ClientSession[] = [];
  const resyncs = { n: 0 };

  const mkClient = async (
    id: string,
    role: 'player' | 'spectator',
    extra: Partial<Parameters<typeof createClientSession>[0]> = {}
  ) => {
    const transport = net.createTransport({ code: CODE, selfId: id, role });
    const origSend = transport.sendIntent.bind(transport);
    transport.sendIntent = env => {
      if (env.msg.type === 'RESYNC') resyncs.n++;
      origSend(env);
    };
    const session = createClientSession({
      transport,
      identity: { participantId: id, token: `tok-${id}` },
      role, nickname: `N-${id}`, teamName: `Team ${id}`,
      ...extra,
    });
    const p = session.connect();
    // la catena connect -> presence -> LISTENING -> HELLO -> SNAPSHOT può
    // costare ~4 latenze: pompa finché lo stato avanza (max ~12 s simulati)
    for (let i = 0; i < 60 && session.getStatus() === 'connecting'; i++) await pump(200);
    await p;
    for (let i = 0; i < 30 && session.getStatus() === 'joining'; i++) await pump(200);
    clients.push(session);
    return session;
  };

  return { net, host, clients, mkClient, pump, resyncs };
}

describe('sessioni multiplayer su rete in memoria', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    now = T0;
  });
  afterEach(() => vi.useRealTimers());

  it('a) host + 7 giocatori + 1 spettatore: tutti ready, stesso hash, spettatore fuori dai players', async () => {
    const { host, clients, mkClient, pump, resyncs } = await makeNetwork();
    for (let i = 0; i < 7; i++) await mkClient(`p${i}`, 'player');
    await mkClient('spec', 'spectator');
    await pump(1500);
    for (const s of clients) {
      expect(s.getStatus(), clients.map(c => c.getStatus()).join(',')).toBe('ready');
      expect(stateHash(s.getState()!)).toBe(stateHash(host.getState()));
    }
    expect(host.getState().players).toHaveLength(8); // host + 7
    expect(host.getState().players.some(p => p.id === 'spec')).toBe(false);
    expect(resyncs.n).toBe(0);
  });

  it('b) asta completa con dropRate 0.05: i client convergono all’hash dell’host', async () => {
    const { net, host, clients, mkClient, pump, resyncs } = await makeNetwork({ dropRate: 0.05 });
    for (let i = 0; i < 3; i++) await mkClient(`p${i}`, 'player');
    await pump(1500);
    host.startAuction(makePool());
    let guard = 0;
    while (host.getState().auction?.phase !== 'complete' && guard++ < 2000) {
      const inner = nextAuctionAction(host.getState());
      if (!inner) break;
      host.dispatch({ type: 'AUCTION', action: inner });
      await pump(30);
    }
    expect(host.getState().auction?.phase).toBe('complete');
    // lascia chiudere i buchi e risincronizzare
    for (let i = 0; i < 80; i++) await pump(200);
    console.log(`[stats] RESYNC: ${resyncs.n}, eventi inviati: ${net.eventsSent}, consegnati: ${net.eventsDelivered}, revs: ${clients.map(c=>c.getState()?.rev).join(',')} vs host ${host.getState().rev}`);
    const h = stateHash(host.getState());
    for (const c of clients) {
      expect(
        stateHash(c.getState()!),
        `rev client ${c.getState()?.rev} vs host ${host.getState().rev}`
      ).toBe(h);
    }
  });

  it('c) disconnect -> autopilot ovunque; reconnect + HELLO -> human', async () => {
    const { net, host, mkClient, pump } = await makeNetwork();
    await mkClient('p1', 'player');
    const observer = await mkClient('p2', 'player');
    await pump(1500);
    host.startAuction(makePool());
    await pump(500);
    const teamOf = (s: RoomState) => s.teams.find(t => t.ownerId === 'p1')!;

    net.disconnect('p1');
    await pump(1500);
    expect(host.getState().players.find(p => p.id === 'p1')?.connected).toBe(false);
    expect(teamOf(host.getState()).controller).toBe('autopilot');
    expect(teamOf(observer.getState()!).controller).toBe('autopilot');

    net.reconnect('p1');
    await pump(2500);
    expect(host.getState().players.find(p => p.id === 'p1')?.connected).toBe(true);
    expect(teamOf(host.getState()).controller).toBe('human');
  });

  it('d) token errato -> bad_token; espulso -> kicked anche riprovando', async () => {
    const { net, host, mkClient, pump } = await makeNetwork();
    const good = await mkClient('p1', 'player');
    await pump(1500);
    expect(good.getStatus()).toBe('ready');

    // p1 cade: un altro client con lo stesso id ma token diverso
    // riceve un nuovo LISTENING e viene rifiutato (bad_token)
    net.disconnect('p1');
    await pump(1500);
    const impostor = createClientSession({
      transport: net.createTransport({ code: CODE, selfId: 'p1', role: 'player' }),
      identity: { participantId: 'p1', token: 'wrong' },
      role: 'player', nickname: 'X', teamName: 'Y',
    });
    const p = impostor.connect();
    for (let i = 0; i < 60 && impostor.getStatus() === 'connecting'; i++) await pump(200);
    await p;
    await pump(1500);
    expect(impostor.getStatus()).toBe('rejected');
    expect(impostor.getRejectReason()).toBe('bad_token');

    // kick di p1: chi rientra con la stessa identità è rifiutato (kicked)
    host.kick('p1');
    await pump(500);
    expect(host.getState().players.some(pl => pl.id === 'p1')).toBe(false);
    net.disconnect('p1'); // chiude anche la connessione dell'impostore
    await pump(500);
    const retry = createClientSession({
      transport: net.createTransport({ code: CODE, selfId: 'p1', role: 'player' }),
      identity: { participantId: 'p1', token: 'tok-p1' },
      role: 'player', nickname: 'X', teamName: 'Y',
    });
    const p3 = retry.connect();
    for (let i = 0; i < 60 && retry.getStatus() === 'connecting'; i++) await pump(200);
    await p3;
    await pump(1500);
    expect(retry.getStatus()).toBe('rejected');
    expect(retry.getRejectReason()).toBe('kicked');
  });

  it('e) chi non manda PING diventa disconnesso dopo ABSENT_AFTER_MS (presence ancora attiva)', async () => {
    const { host, mkClient, pump } = await makeNetwork();
    // tick inerte: la sessione entra (HELLO) ma non pinga mai
    await mkClient('silent', 'player', { tick: () => () => {} });
    await pump(1500);
    expect(host.getState().players.find(p => p.id === 'silent')?.connected).toBe(true);
    await vi.advanceTimersByTimeAsync(ABSENT_AFTER_MS + 2000);
    expect(host.getState().players.find(p => p.id === 'silent')?.connected).toBe(false);
  });

  it('g) chi riprende a pingare dopo l’assenza riceve LISTENING, rifà HELLO e torna connesso', async () => {
    const { host, mkClient, pump } = await makeNetwork();
    // ping manuale: niente tick automatico
    const silent = await mkClient('p1', 'player', { tick: () => () => {} });
    await pump(1500);
    host.startAuction(makePool());
    await pump(500);
    const teamOf = (s: RoomState) => s.teams.find(t => t.ownerId === 'p1')!;

    // smette di pingare (presence ancora attiva) -> assente + autopilot
    await vi.advanceTimersByTimeAsync(ABSENT_AFTER_MS + 2000);
    expect(host.getState().players.find(p => p.id === 'p1')?.connected).toBe(false);
    expect(teamOf(host.getState()).controller).toBe('autopilot');

    // torna attivo: un intento non-HELLO scatena LISTENING -> HELLO -> connesso
    silent.sendIntent({ type: 'PING', t: Date.now() });
    await pump(2500);
    expect(host.getState().players.find(p => p.id === 'p1')?.connected).toBe(true);
    expect(teamOf(host.getState()).controller).toBe('human');
    expect(silent.getStatus()).toBe('ready');
  });

  it('h) oltre MAX_SPECTATORS spettatori lo HELLO è rifiutato con full', async () => {
    const { mkClient, pump } = await makeNetwork();
    for (let i = 0; i < MAX_SPECTATORS; i++) await mkClient(`s${i}`, 'spectator');
    await pump(1500);
    const extra = await mkClient('extra', 'spectator');
    await pump(1500);
    expect(extra.getStatus()).toBe('rejected');
    expect(extra.getRejectReason()).toBe('full');
  });

  it('f) clock sfasato di +5 s: hostNow() entro ±150 ms dal vero orologio host', async () => {
    const { pump, mkClient } = await makeNetwork();
    const skewed = await mkClient('skew', 'player', { now: () => Date.now() + 5000 });
    await pump(6000); // qualche giro di PING/PONG
    const est = skewed.hostNow();
    const err = Math.abs(est - Date.now());
    expect(err).toBeLessThanOrEqual(150);
  });
});
