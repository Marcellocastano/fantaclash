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
        settings: { season: '2024-25', difficulty: 'normale', fillWithBots: true },
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
});
