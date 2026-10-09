import { createClockSync, ClockSync } from './clock/clockSync';
import { intervalTick, TickFn } from './clock/tick';
import { RoomKeyPair, sameKey, serialQueue, signPayload, verifyPayload } from './crypto';
import { PING_INTERVAL_MS, PROTOCOL_VERSION } from './constants';
import { stateHash } from './hash';
import { RoomIdentity } from './identity';
import {
  ClientIntent,
  Envelope,
  HostMessage,
  RejectReason,
  RoomState,
} from './protocol';
import { applyHostAction } from './roomReducer';
import { RoomTransport } from './transport/types';

/**
 * Sessione client: entra nella stanza (LISTENING -> HELLO -> SNAPSHOT),
 * applica le ACTION numerate e resynchronizza su buchi o hash diverso.
 * I PING periodici alimentano la stima dell'orologio dell'host.
 * Pura: niente React; tempo e tick iniettabili.
 */

export type ClientStatus = 'connecting' | 'joining' | 'ready' | 'rejected' | 'closed';

export interface ClientSessionOptions {
  transport: RoomTransport;
  identity: RoomIdentity;
  role: 'player' | 'spectator';
  nickname: string;
  teamName: string;
  /** Coppia ECDSA del partecipante: firma gli intenti in uscita */
  keyPair?: RoomKeyPair;
  /** Chiave pubblica dell'host già fissata per questo codice (TOFU) */
  knownHostKey?: JsonWebKey;
  /** Chiave pubblica del partecipante da mandare nell'HELLO */
  pubKey?: JsonWebKey;
  now?: () => number;
  tick?: TickFn;
}

export interface ClientSession {
  connect(): Promise<void>;
  getState(): RoomState | null;
  getStatus(): ClientStatus;
  getRejectReason(): RejectReason | null;
  /** CALL/BID e gli altri intenti applicativi */
  sendIntent(intent: ClientIntent): void;
  /** Orologio stimato dell'host */
  hostNow(): number;
  /** Chiave pubblica dell'host fissata alla prima SNAPSHOT (null se ignota) */
  getHostKey(): JsonWebKey | null;
  /** Messaggi host scartati per firma non valida (debug) */
  getDrops(): number;
  /** true dopo ROOM_CLOSED: la stanza è stata chiusa dall'host */
  isRoomClosed(): boolean;
  subscribe(cb: (state: RoomState | null, status: ClientStatus) => void): () => void;
  close(): Promise<void>;
}

/** Timeout in attesa del LISTENING dell'host */
const LISTENING_TIMEOUT_MS = 10_000;
/** Finestra prima di chiedere un resync per un buco di rev */
const RESYNC_DELAY_MS = 500;
/** Buffer massimo di ACTION fuori ordine */
const BUFFER_MAX = 50;

export function createClientSession({
  transport,
  identity,
  role,
  nickname,
  teamName,
  keyPair,
  knownHostKey,
  pubKey,
  now = Date.now,
  tick = intervalTick,
}: ClientSessionOptions): ClientSession {
  const me = identity.participantId;
  let status: ClientStatus = 'connecting';
  let rejectReason: RejectReason | null = null;
  let state: RoomState | null = null;
  // Chiave dell'host fissata alla prima SNAPSHOT (trust-on-first-use)
  let hostKey: JsonWebKey | null = knownHostKey ?? null;
  let drops = 0;
  let roomClosed = false;

  // Verifica e applicazione serializzate: le ACTION restano in ordine
  const verifyQueue = serialQueue();
  const signQueue = serialQueue();

  const clock: ClockSync = createClockSync(now);
  const buffer = new Map<number, Extract<HostMessage, { type: 'ACTION' }>>();
  const listeners = new Set<(s: RoomState | null, status: ClientStatus) => void>();
  const cleanups: (() => void)[] = [];

  let resyncTimer: ReturnType<typeof setTimeout> | null = null;
  let awaitingSnapshot = false;
  let helloSent = false;

  const emit = () => listeners.forEach(cb => cb(state, status));

  function setStatus(next: ClientStatus, reason: RejectReason | null = rejectReason) {
    status = next;
    rejectReason = reason;
    emit();
  }

  function send(msg: ClientIntent) {
    if (!keyPair) {
      transport.sendIntent({ from: me, msg });
      return;
    }
    signQueue(async () => {
      const sig = await signPayload(keyPair.privateJwk, msg);
      transport.sendIntent({ from: me, msg, sig });
    });
  }

  function sendHello() {
    helloSent = true;
    send({
      type: 'HELLO',
      playerId: me,
      token: identity.token,
      nickname,
      teamName,
      protocol: PROTOCOL_VERSION,
      role,
      pubKey: pubKey ?? keyPair?.publicJwk,
    });
  }

  /** Richiesta di resync; si ripete ogni RESYNC_DELAY_MS finché non
   *  arriva lo SNAPSHOT (la risposta può essere persa dal broadcast) */
  function resync() {
    awaitingSnapshot = true;
    buffer.clear();
    send({ type: 'RESYNC', fromRev: state?.rev ?? 0 });
    if (resyncTimer) clearTimeout(resyncTimer);
    resyncTimer = setTimeout(() => {
      resyncTimer = null;
      if (awaitingSnapshot) resync();
    }, RESYNC_DELAY_MS);
  }

  /** Se il buco di rev non si chiude entro RESYNC_DELAY_MS -> RESYNC */
  function scheduleResyncCheck() {
    if (resyncTimer) return;
    resyncTimer = setTimeout(() => {
      resyncTimer = null;
      if (state && [...buffer.keys()].some(r => r > state!.rev)) resync();
    }, RESYNC_DELAY_MS);
  }

  /** Applica un'azione in sequenza; rifiuto del reducer -> desincronizzato */
  function apply(rev: number, action: Parameters<typeof applyHostAction>[2]) {
    const next = applyHostAction(state!, rev, action);
    if (next === state) {
      resync();
      return;
    }
    state = next;
    emit();
  }

  /** Svuota il buffer finché il prossimo rev è presente */
  function drainBuffer() {
    if (!state) return;
    while (!awaitingSnapshot) {
      const next = buffer.get(state.rev + 1);
      if (!next) break;
      buffer.delete(next.rev);
      apply(next.rev, next.action);
    }
    if (state && buffer.size > 0 && !awaitingSnapshot) scheduleResyncCheck();
  }

  function onMessage(env: Envelope<HostMessage>) {
    verifyQueue(async () => {
      const msg = env.msg;
      // Prima della fissazione si accettano messaggi senza verifica: una
      // falsa LISTENING fa solo rimandare HELLO, il danno è nullo.
      // Una SNAPSHOT con una chiave diversa da quella fissata è ignorata.
      if (msg.type === 'SNAPSHOT' && msg.hostPubKey) {
        if (hostKey && !sameKey(hostKey, msg.hostPubKey)) {
          drops++;
          return;
        }
        if (!(await verifyPayload(msg.hostPubKey, env.sig ?? '', msg))) {
          drops++;
          return;
        }
        hostKey = msg.hostPubKey;
        handleVerified(msg);
        return;
      }
      if (hostKey) {
        if (!env.sig || !(await verifyPayload(hostKey, env.sig, msg))) {
          drops++;
          return;
        }
      }
      handleVerified(msg);
    });
  }

  function handleVerified(msg: HostMessage) {
    switch (msg.type) {
      case 'ROOM_CLOSED':
        roomClosed = true;
        setStatus('closed');
        return;

      case 'LISTENING':
        if (msg.to !== me) return;
        // Anche da 'ready': dopo una disconnessione l'host ci riascolta e
        // il nuovo HELLO (stesso token) ci riporta connessi. Da 'closed'
        // (timeout LISTENING) ci si può riprendere: la stanza esiste.
        if (status === 'rejected' || roomClosed) return;
        sendHello();
        if (status === 'connecting' || status === 'closed') setStatus('joining');
        return;

      case 'REJECT':
        if (msg.to !== me) return;
        setStatus('rejected', msg.reason);
        return;

      case 'SNAPSHOT':
        if (msg.to !== undefined && msg.to !== me) return;
        state = msg.state;
        awaitingSnapshot = false;
        if (resyncTimer) { clearTimeout(resyncTimer); resyncTimer = null; }
        drainBuffer();
        if (status !== 'rejected' && !roomClosed) setStatus('ready');
        else emit();
        return;

      case 'ACTION': {
        if (!state || awaitingSnapshot) return;
        if (msg.rev <= state.rev) return;
        if (msg.rev === state.rev + 1) {
          apply(msg.rev, msg.action);
          if (!awaitingSnapshot) drainBuffer();
        } else {
          if (buffer.size >= BUFFER_MAX) {
            resync();
            return;
          }
          buffer.set(msg.rev, msg);
          scheduleResyncCheck();
        }
        return;
      }

      case 'HASH':
        // rev diverso = coda persa o fork; stesso rev e hash diverso = divergenza
        if (state && msg.rev !== state.rev) resync();
        else if (state && msg.hash !== stateHash(state)) resync();
        return;

      case 'PONG':
        if (msg.to !== me) return;
        clock.addSample(msg.t, now(), msg.hostNow);
        return;
    }
  }

  return {
    async connect() {
      cleanups.push(transport.onHostMessage(onMessage));
      await transport.connect();
      // PING periodico: liveness + misura RTT per clockSync
      cleanups.push(
        tick(() => send({ type: 'PING', t: now() }), PING_INTERVAL_MS)
      );
      // LISTENING/SNAPSHOT possono perdersi: riprova l'HELLO finché non si entra
      // (anche dopo il timeout 'closed': la presenza può propagarsi in ritardo)
      cleanups.push(
        tick(() => {
          if (status === 'connecting' || status === 'joining' || (status === 'closed' && !roomClosed)) {
            sendHello();
          }
        }, 2_000)
      );
      // Attesa del LISTENING dell'host
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          setStatus('closed');
          reject(new Error('LISTENING non ricevuto entro 10s'));
        }, LISTENING_TIMEOUT_MS);
        const listener = (_: RoomState | null, s: ClientStatus) => {
          if (s === 'joining' || s === 'ready' || s === 'rejected' || s === 'closed') {
            clearTimeout(timeout);
            listeners.delete(listener);
            resolve();
          }
        };
        listeners.add(listener);
        // se LISTENING è già arrivato durante connect()
        if (helloSent) { clearTimeout(timeout); listeners.delete(listener); resolve(); }
      });
    },

    getState: () => state,
    getStatus: () => status,
    getRejectReason: () => rejectReason,
    sendIntent: send,
    hostNow: () => clock.hostNow(),
    getHostKey: () => hostKey,
    getDrops: () => drops,
    isRoomClosed: () => roomClosed,

    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    async close() {
      cleanups.forEach(fn => fn());
      if (resyncTimer) clearTimeout(resyncTimer);
      await transport.close();
      setStatus('closed');
    },
  };
}
