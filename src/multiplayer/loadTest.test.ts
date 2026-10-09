import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClientSession, ClientSession } from './clientSession';
import { createHostSession } from './hostSession';
import { createMemoryNetwork } from './transport/memory';
import { createRoom } from './roomReducer';
import { stateHash } from './hash';
import { RoomState } from './protocol';
import { createRng, getCurrentCallerId, ROLE_ORDER } from '../services/auction';
import { createTestPlayer } from '../test/testUtils';
import { Player, PlayerRole } from '../types';
import { buildBotRecords, buildDraw, buildRoundStart, buildStartTournament } from './hostTournament';
import { currentRound, roundMatches } from '../domain/tournament';
import { MATCH_LEAD_MS } from './constants';

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
const tickNow = (ms = 500) => (now += ms);

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

/**
 * B6 — prova di carico su rete in memoria: host + 7 giocatori +
 * 3 spettatori, latenza 20-200 ms, dropRate 0.03. Asta completa con
 * rilanci casuali dei client, poi torneo con partite live fino alla
 * finale. Alla fine tutti gli hash devono coincidere.
 */
describe('prova di carico (rete in memoria)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    now = T0;
  });
  afterEach(() => vi.useRealTimers());

  it('host + 7 giocatori + 3 spettatori: asta e torneo completi, hash identici', async () => {
    const rng = createRng(7);
    const net = createMemoryNetwork({ rng, latency: { min: 20, max: 200 }, dropRate: 0.03 });
    const pump = (ms = 60) => vi.advanceTimersByTimeAsync(ms);
    const initial = createRoom({
      code: CODE, hostId: 'h1',
      host: { nickname: 'Host', teamName: 'Host FC' },
      settings: { season: '2024-25', difficulty: 'normale' },
      now: Date.now(),
    });
    const hostTransport = net.createTransport({ code: CODE, selfId: 'h1', role: 'host' });
    const hc = hostTransport.connect();
    await pump(300);
    await hc;
    const host = createHostSession({
      transport: hostTransport, initialState: initial, hostToken: 'tok-h1', rng: createRng(11),
    });

    const clients: ClientSession[] = [];
    const mkClient = async (id: string, role: 'player' | 'spectator') => {
      const session = createClientSession({
        transport: net.createTransport({ code: CODE, selfId: id, role }),
        identity: { participantId: id, token: `tok-${id}` },
        role, nickname: `N-${id}`, teamName: `Team ${id}`,
      });
      const p = session.connect();
      for (let i = 0; i < 80 && session.getStatus() === 'connecting'; i++) await pump(200);
      await p;
      for (let i = 0; i < 40 && session.getStatus() === 'joining'; i++) await pump(200);
      clients.push(session);
      return session;
    };

    for (let i = 0; i < 7; i++) await mkClient(`p${i}`, 'player');
    for (let i = 0; i < 3; i++) await mkClient(`s${i}`, 'spectator');
    // convergenza degli handshake sotto dropRate 0.03
    for (let i = 0; i < 200 && !clients.every(c => c.getStatus() === 'ready'); i++) await pump(500);
    expect(clients.every(c => c.getStatus() === 'ready')).toBe(true);

    // --- Asta con rilanci casuali dei client ---
    host.startAuction(makePool());
    let guard = 0;
    let bids = 0;
    while (host.getState().auction?.phase !== 'complete' && guard++ < 3000) {
      const a = host.getState().auction;
      // ogni tanto un rilancio da un client a caso
      if (a?.phase === 'bidding' && rng() < 0.3) {
        const c = clients[Math.floor(rng() * 7)];
        c.sendIntent({ type: 'BID', amount: a.lot!.currentBid + 1 });
        bids++;
      }
      const inner = nextAuctionAction(host.getState());
      if (!inner) break;
      host.dispatch({ type: 'AUCTION', action: inner });
      await pump(30);
    }
    expect(host.getState().auction?.phase).toBe('complete');

    // --- Torneo con partite live fino alla finale ---
    host.dispatch(buildStartTournament(rng));
    const draw = buildDraw(host.getState(), rng);
    if (draw) host.dispatch(draw);
    await pump(500);

    guard = 0;
    while (guard++ < 2000) {
      const s = host.getState();
      if (s.phase === 'final') break;
      if (s.tournament?.status === 'completed') {
        host.dispatch({ type: 'FINISH' });
        await pump(300);
        continue;
      }
      const round = currentRound(s.tournament?.status ?? 'draw');
      const ready = round
        ? roundMatches(s.tournament!.bracket, round).filter(m => !s.tournament!.matches[m.id] && !s.live[m.id])
        : [];
      if (ready.length > 0) {
        const startAt = Date.now() + MATCH_LEAD_MS;
        for (const a2 of buildRoundStart(s, startAt)) host.dispatch(a2);
        // le partite tra soli bot le registra il driver (buildBotRecords)
        for (const a3 of buildBotRecords(s)) host.dispatch(a3);
      }
      await pump(300);
    }
    expect(host.getState().phase).toBe('final');

    // convergenza: sotto dropRate i resync impiegano qualche giro
    const target = stateHash(host.getState());
    for (let i = 0; i < 400 && clients.some(c => stateHash(c.getState()!) !== target); i++) {
      await pump(300);
    }
    const h = stateHash(host.getState());
    const divergent = clients.filter(c => stateHash(c.getState()!) !== h);
    console.log(
      `[load] rev host=${host.getState().rev} bids=${bids} inviati=${net.eventsSent} consegnati=${net.eventsDelivered} divergenti=${divergent.length}`
    );
    expect(divergent.map(c => c.getState()?.rev)).toEqual([]);
  }, 120_000);
});
