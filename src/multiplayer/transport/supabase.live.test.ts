// @vitest-environment node
/**
 * Test live contro Supabase Realtime: eseguito solo con MP_LIVE=1.
 *   MP_LIVE=1 npx vitest run src/multiplayer/transport/supabase.live.test.ts
 * Le chiavi si leggono da .env.local via loadEnv (mai stampate).
 */
import { describe, it, expect } from 'vitest';
import { loadEnv } from 'vite';
import { createClientSession } from '../clientSession';
import { createHostSession } from '../hostSession';
import { createRoom } from '../roomReducer';
import { generateRoomCode } from '../roomCode';
import { stateHash } from '../hash';
import { createSupabaseTransport } from './supabase';
import { RoomState } from '../protocol';
import { getCurrentCallerId } from '../../services/auction';
import { createTestPlayer } from '../../test/testUtils';
import { Player, PlayerRole } from '../../types';
import { ROLE_ORDER } from '../../services/auction';

const LIVE = !!process.env.MP_LIVE;

describe.skipIf(!LIVE)('supabase transport live', () => {
  it('host + 2 giocatori: join, 3 PING/PONG, chiusura', async () => {
    const env = loadEnv('', process.cwd(), 'VITE_SUPABASE_');
    // il transport legge solo import.meta.env: riempiamo le due chiavi da .env.local
    import.meta.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL;
    import.meta.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
    const code = generateRoomCode();
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    const hostTransport = await createSupabaseTransport({ code, selfId: 'h1', role: 'host' });
    await hostTransport.connect();
    const host = createHostSession({
      transport: hostTransport,
      initialState: createRoom({
        code, hostId: 'h1',
        host: { nickname: 'Host', teamName: 'Host FC' },
        settings: { season: '2024-25', difficulty: 'normale' },
        now: Date.now(),
      }),
      hostToken: 'tok-h1',
    });

    const sessions = [];
    for (const id of ['p1', 'p2']) {
      const t = await createSupabaseTransport({ code, selfId: id, role: 'player' });
      const s = createClientSession({
        transport: t,
        identity: { participantId: id, token: `tok-${id}` },
        role: 'player', nickname: `N-${id}`, teamName: `T-${id}`,
      });
      await s.connect();
      sessions.push(s);
    }
    // attesa finché entrambi sono ready (SNAPSHOT ricevuto)
    for (let i = 0; i < 40 && sessions.some(s => s.getStatus() !== 'ready'); i++) await sleep(250);
    for (const s of sessions) {
      expect(s.getStatus()).toBe('ready');
      expect(stateHash(s.getState()!)).toBe(stateHash(host.getState()));
    }
    // qualche PING/PONG è già avvenuto: hostNow stimato vicino al vero
    await sleep(5000);
    for (const s of sessions) {
      const err = Math.abs(s.hostNow() - Date.now());
      expect(err).toBeLessThan(1000);
    }
    for (const s of sessions) await s.close();
    await host.destroy();
  }, 60000);

  function nextAuctionAction(state: RoomState) {
    const a = state.auction!;
    switch (a.phase) {
      case 'calling': {
        const callerId = getCurrentCallerId(a)!;
        const player = a.remainingPlayers.find(p => p.role === a.currentRole)!;
        return { type: 'CALL_PLAYER' as const, teamId: callerId, playerId: player.id, now: Date.now(), seed: 1 };
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

  function makePool(): Player[] {
    const counts: Record<PlayerRole, number> = { P: 4, D: 8, C: 8, A: 8 };
    const pool: Player[] = [];
    for (const role of ROLE_ORDER) {
      for (let i = 0; i < counts[role]; i++) {
        pool.push(createTestPlayer({ id: `${role}${i}`, role, baseValue: 10 }));
      }
    }
    return pool;
  }

  /**
   * B6 — prova di carico live: host + 7 giocatori, asta lampo a ~20 azioni/s
   * per 60 s con qualche rilancio dei client. Riporta eventi/s, latenza
   * p50/p95 e verifica che nessun client si disconnetta.
   */
  it('carico live: host + 7 giocatori, ~20 azioni/s per 60 s', async () => {
    const env = loadEnv('', process.cwd(), 'VITE_SUPABASE_');
    import.meta.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL;
    import.meta.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
    const code = generateRoomCode();
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    const hostTransport = await createSupabaseTransport({ code, selfId: 'h1', role: 'host' });
    await hostTransport.connect();
    const host = createHostSession({
      transport: hostTransport,
      initialState: createRoom({
        code, hostId: 'h1',
        host: { nickname: 'Host', teamName: 'Host FC' },
        settings: { season: '2024-25', difficulty: 'normale' },
        now: Date.now(),
      }),
      hostToken: 'tok-h1',
    });

    const sessions = [];
    for (let i = 0; i < 7; i++) {
      const id = `p${i}`;
      const t = await createSupabaseTransport({ code, selfId: id, role: 'player' });
      const s = createClientSession({
        transport: t,
        identity: { participantId: id, token: `tok-${id}` },
        role: 'player', nickname: `N-${id}`, teamName: `T-${id}`,
      });
      await s.connect();
      sessions.push(s);
    }
    for (let i = 0; i < 60 && sessions.some(s => s.getStatus() !== 'ready'); i++) await sleep(250);
    expect(sessions.every(s => s.getStatus() === 'ready')).toBe(true);

    host.startAuction(makePool());

    // latenza dispatch -> ricezione rev sul primo client
    const latencies: number[] = [];
    let targetRev = 0;
    sessions[0].subscribe(s => {
      if (s && s.rev === targetRev && targetRev > 0) latencies.push(Date.now() - dispatchAt);
    });
    let dispatchAt = 0;

    const DURATION_MS = 60_000;
    const INTERVAL_MS = 50; // ~20 azioni/s
    const t0 = Date.now();
    let sent = 0;
    let bids = 0;
    while (Date.now() - t0 < DURATION_MS) {
      const st = host.getState();
      if (st.auction?.phase === 'complete') break;
      const inner = st.auction ? nextAuctionAction(st) : null;
      if (inner) {
        dispatchAt = Date.now();
        targetRev = st.rev + 1;
        host.dispatch({ type: 'AUCTION', action: inner });
        sent++;
      }
      if (st.auction?.phase === 'bidding' && Math.random() < 0.15) {
        sessions[Math.floor(Math.random() * sessions.length)]
          .sendIntent({ type: 'BID', amount: st.auction.lot!.currentBid + 1 });
        bids++;
      }
      await sleep(INTERVAL_MS);
    }
    await sleep(4000);

    const sorted = [...latencies].sort((a, b) => a - b);
    const p = (q: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : -1);
    console.log(
      `[live-load] azioni/s=${(sent / ((Date.now() - t0) / 1000)).toFixed(1)} ` +
      `inviate=${sent} rilanci=${bids} latenza p50=${p(0.5)}ms p95=${p(0.95)}ms ` +
      `stati=${sessions.map(s => s.getStatus())}`
    );

    // nessuna disconnessione, hash convergenti (o rev allineata)
    expect(sessions.every(s => s.getStatus() === 'ready')).toBe(true);
    const h = stateHash(host.getState());
    expect(sessions.every(s => s.getState() && stateHash(s.getState()!) === h)).toBe(true);

    for (const s of sessions) await s.close();
    await host.destroy();
  }, 180_000);
});
