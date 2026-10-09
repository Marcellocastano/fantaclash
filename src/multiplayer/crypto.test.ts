import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClientSession } from './clientSession';
import { createHostSession } from './hostSession';
import { createMemoryNetwork } from './transport/memory';
import { createRoom } from './roomReducer';
import { createRng } from '../services/auction';
import { generateRoomKeyPair, signPayload } from './crypto';
import { Envelope, HostMessage } from './protocol';

const T0 = 1_000_000;
const CODE = 'ABCDE';

/**
 * Firma ECDSA dei messaggi di stanza su rete in memoria (WebCrypto reale).
 * L'host firma i messaggi di downlink, i client fissano la sua chiave
 * alla prima SNAPSHOT e firmano gli intenti; l'host fissa le loro chiavi
 * al primo ingresso.
 */

async function setup() {
  const net = createMemoryNetwork({ rng: createRng(42), latency: { min: 5, max: 30 }, dropRate: 0 });
  const pump = (ms = 50) => vi.advanceTimersByTimeAsync(ms);
  const hostKey = await generateRoomKeyPair();
  const initial = createRoom({
    code: CODE, hostId: 'h1',
    host: { nickname: 'Host', teamName: 'Host FC' },
    settings: { season: '2024-25', difficulty: 'normale' },
    now: Date.now(),
  });
  const hostTransport = net.createTransport({ code: CODE, selfId: 'h1', role: 'host', pubKey: hostKey.publicJwk });
  const hc = hostTransport.connect();
  await pump(300);
  await hc;
  const host = createHostSession({
    transport: hostTransport, initialState: initial, hostToken: 'tok-h1', rng: createRng(9), hostKey,
  });

  const mkClient = async (id: string, keyPair?: Awaited<ReturnType<typeof generateRoomKeyPair>>) => {
    const kp = keyPair ?? (await generateRoomKeyPair());
    const transport = net.createTransport({ code: CODE, selfId: id, role: 'player' });
    const session = createClientSession({
      transport,
      identity: { participantId: id, token: `tok-${id}` },
      role: 'player', nickname: `N-${id}`, teamName: `Team ${id}`,
      keyPair: kp,
      pubKey: kp.publicJwk,
    });
    const p = session.connect();
    for (let i = 0; i < 80 && session.getStatus() === 'connecting'; i++) await pump(200);
    await p;
    for (let i = 0; i < 40 && session.getStatus() === 'joining'; i++) await pump(200);
    return { session, transport, keyPair: kp };
  };

  return { net, host, hostKey, mkClient, pump };
}

describe('firma dei messaggi di stanza', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('client con chiavi: entra, fissa la chiave dell\'host, azioni accettate', async () => {
    const { host, hostKey, mkClient, pump } = await setup();
    const { session } = await mkClient('p1');
    await pump(1500);
    expect(session.getStatus()).toBe('ready');
    expect(session.getHostKey()).toEqual(hostKey.publicJwk);
    expect(host.getState().players.some(p => p.id === 'p1')).toBe(true);
    // un'azione successiva firmata arriva e si applica
    expect(host.dispatch({ type: 'SETTINGS', settings: { season: '2020-21' } })).toBe(true);
    await pump(800);
    expect(session.getState()?.settings.season).toBe('2020-21');
    expect(session.getDrops()).toBe(0);
  });

  it('messaggio host falsificato (firma di un\'altra chiave): scartato', async () => {
    const { net, hostKey, mkClient, pump } = await setup();
    const { session } = await mkClient('p1');
    await pump(1500);
    expect(session.getHostKey()).toEqual(hostKey.publicJwk);

    // Un impostore trasmette sul downlink una ACTION firmata con la SUA chiave
    const evilKey = await generateRoomKeyPair();
    const evilTransport = net.createTransport({ code: CODE, selfId: 'evil', role: 'host', pubKey: evilKey.publicJwk });
    const ec = evilTransport.connect();
    await pump(300);
    await ec;
    const fake: HostMessage = {
      type: 'ACTION', rev: 99, hostNow: Date.now(),
      action: { type: 'PLAYER_CONNECTION', playerId: 'p1', connected: false },
    };
    const env: Envelope<HostMessage> = { from: 'h1', msg: fake, sig: await signPayload(evilKey.privateJwk, fake) };
    evilTransport.broadcast(env);
    await pump(800);
    expect(session.getDrops()).toBeGreaterThan(0);
    expect(session.getState()!.rev).toBeLessThan(99); // rev falsificato non applicato
  });

  it('SNAPSHOT con chiave diversa da quella fissata: ignorata', async () => {
    const { net, hostKey, mkClient, pump } = await setup();
    const { session } = await mkClient('p1');
    await pump(1500);
    expect(session.getHostKey()).toEqual(hostKey.publicJwk);
    const rev = session.getState()!.rev;

    const evilKey = await generateRoomKeyPair();
    const evilTransport = net.createTransport({ code: CODE, selfId: 'evil', role: 'host', pubKey: evilKey.publicJwk });
    const ec = evilTransport.connect();
    await pump(300);
    await ec;
    const fake: HostMessage = {
      type: 'SNAPSHOT', rev: 999, state: session.getState()!, hash: 'x', hostNow: Date.now(),
      hostPubKey: evilKey.publicJwk,
    };
    evilTransport.broadcast({ from: 'h1', msg: fake, sig: await signPayload(evilKey.privateJwk, fake) });
    await pump(800);
    expect(session.getState()!.rev).toBe(rev);
    expect(session.getHostKey()).toEqual(hostKey.publicJwk);
    expect(session.getDrops()).toBeGreaterThan(0);
  });

  it('BID di un impostore sull\'uplink della vittima: scartato', async () => {
    const { net, host, mkClient, pump } = await setup();
    const { session } = await mkClient('victim');
    await pump(1500);
    const rev = host.getState().rev;

    // Impostore sulla stessa identità uplink (selfId uguale) ma senza la chiave della vittima
    const evilKey = await generateRoomKeyPair();
    const evilTransport = net.createTransport({ code: CODE, selfId: 'victim', role: 'player' });
    const ec = evilTransport.connect();
    await pump(300);
    await ec;
    const bid = { type: 'BID' as const, amount: 5 };
    evilTransport.sendIntent({ from: 'victim', msg: bid, sig: await signPayload(evilKey.privateJwk, bid) });
    await pump(800);
    expect(host.getState().rev).toBe(rev); // nessuna azione accettata
    // la vittima vera resta connessa e può ancora firmare
    expect(session.getStatus()).toBe('ready');
  });

  it('rientro con la stessa chiave: accettato; chiave diversa: bad_token', async () => {
    const { net, host, mkClient, pump } = await setup();
    const good = await mkClient('p1');
    await pump(1500);
    expect(good.session.getStatus()).toBe('ready');

    net.disconnect('p1');
    await pump(1500);
    // rientro con la stessa identità e la stessa chiave
    const back = await mkClient('p1', good.keyPair);
    await pump(1500);
    expect(back.session.getStatus()).toBe('ready');
    expect(host.getState().players.find(p => p.id === 'p1')?.connected).toBe(true);

    // rientro con la stessa identità ma chiave nuova: rifiutato
    net.disconnect('p1');
    await pump(1500);
    const wrongKey = await generateRoomKeyPair();
    const wrong = createClientSession({
      transport: net.createTransport({ code: CODE, selfId: 'p1', role: 'player' }),
      identity: { participantId: 'p1', token: 'tok-p1' },
      role: 'player', nickname: 'X', teamName: 'Y',
      keyPair: wrongKey,
      pubKey: wrongKey.publicJwk,
    });
    const p = wrong.connect();
    for (let i = 0; i < 80 && wrong.getStatus() === 'connecting'; i++) await pump(200);
    await p;
    await pump(1500);
    expect(wrong.getStatus()).toBe('rejected');
    expect(wrong.getRejectReason()).toBe('bad_token');
  });
});
