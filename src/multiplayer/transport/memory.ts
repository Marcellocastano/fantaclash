import { ClientIntent, Envelope, HostMessage, isClientIntent, isHostMessage } from '../protocol';
import { PresenceEntry, RoomTransport, TransportOptions } from './types';

/**
 * Rete in memoria per i test: un hub condivide i messaggi tra transport
 * dello stesso processo. La consegna è asincrona con latenza casuale
 * per destinatario; i messaggi da UN mittente sullo STESSO topic
 * mantengono l'ordine (come un websocket), mittenti diversi no.
 * `dropRate` si applica solo ai broadcast (non alla presence).
 */

export interface MemoryNetworkOptions {
  rng: () => number;
  latency: { min: number; max: number };
  dropRate: number;
}

interface Participant {
  id: string;
  role: PresenceEntry['role'];
  alive: boolean;
  intentCbs: Set<(env: Envelope<ClientIntent>) => void>;
  hostCbs: Set<(env: Envelope<HostMessage>) => void>;
  presenceCbs: Set<(entries: PresenceEntry[]) => void>;
  /** uplink ai quali questo partecipante è iscritto */
  uplinks: Set<string>;
}

export interface MemoryNetwork {
  createTransport(opts: TransportOptions): RoomTransport;
  /** Perdita brusca della connessione: presence leave + niente più I/O */
  disconnect(selfId: string): void;
  reconnect(selfId: string): void;
  readonly eventsSent: number;
  readonly eventsDelivered: number;
}

const DOWNLINK = (code: string) => `room:${code}`;
const UPLINK = (code: string, id: string) => `room:${code}:up:${id}`;

export function createMemoryNetwork({ rng, latency, dropRate }: MemoryNetworkOptions): MemoryNetwork {
  // Chiave = connessione: due transport con lo stesso selfId (es. rejoin o
  // impostore) sono connessioni distinte; la presence deduplica per id.
  const participants = new Map<string, Participant>();
  let connSeq = 0;
  // Catene di consegna per (mittente, topic): mantengono l'ordine del mittente
  const chains = new Map<string, Promise<void>>();
  let _sent = 0;
  let _delivered = 0;

  const lat = () => latency.min + rng() * (latency.max - latency.min);

  /**
   * Catena di ordinamento per (mittente, topic, destinatario): la latenza
   * è campionata all'invio e decorre in parallelo (come su websocket
   * distinti); la catena garantisce solo che il destinatario riceva i
   * messaggi di quel mittente sul quel topic nell'ordine di invio.
   */
  function enqueue(key: string, sendAt: number, latMs: number, fn: () => void) {
    const prev = chains.get(key) ?? Promise.resolve();
    chains.set(key, prev.then(async () => {
      const wait = sendAt + latMs - Date.now();
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      fn();
    }, async () => {
      const wait = sendAt + latMs - Date.now();
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      fn();
    }));
  }

  function deliver(from: string, topic: string, payload: unknown, isBroadcast: boolean) {
    _sent++;
    for (const p of participants.values()) {
      if (!p.alive || p.id === from) continue; // self: false
      // destinatari: iscritti al topic (downlink condiviso o uplink)
      const subscribed = topic === downlinkOf(p) || p.uplinks.has(topic);
      if (!subscribed) continue;
      if (isBroadcast && rng() < dropRate) continue;
      _delivered++;
      const target = p;
      enqueue(`${from}|${topic}|${target.id}`, Date.now(), lat(), () => {
        if (!target.alive) return;
        if (topic === downlinkOf(target)) {
          const env = payload as Envelope<HostMessage>;
          if (!isHostMessage(env.msg)) return;
          target.hostCbs.forEach(cb => cb(env));
        } else {
          const env = payload as Envelope<ClientIntent>;
          if (!isClientIntent(env.msg)) return;
          target.intentCbs.forEach(cb => cb(env));
        }
      });
    }
  }

  // -- helpers di lookup -------------------------------------------------
  const codeOf = new Map<string, string>(); // participantId -> code
  function downlinkOf(p: Participant): string {
    return DOWNLINK(codeOf.get(p.id) ?? '');
  }

  function presenceEntries(): PresenceEntry[] {
    const byId = new Map<string, PresenceEntry>();
    for (const p of participants.values()) {
      if (p.alive && !byId.has(p.id)) byId.set(p.id, { id: p.id, role: p.role });
    }
    return [...byId.values()];
  }

  /** Notifica la lista completa a tutti i partecipanti vivi (mai droppata) */
  function syncPresence() {
    const entries = presenceEntries();
    for (const p of participants.values()) {
      if (!p.alive) continue;
      const target = p;
      enqueue(`presence|${target.id}`, Date.now(), lat(), () => {
        if (target.alive) target.presenceCbs.forEach(cb => cb(entries));
      });
    }
  }

  function createTransport(opts: TransportOptions): RoomTransport {
    const self: Participant = {
      id: opts.selfId,
      role: opts.role,
      alive: false,
      intentCbs: new Set(),
      hostCbs: new Set(),
      presenceCbs: new Set(),
      uplinks: new Set(),
    };

    const connKey = `${opts.selfId}#${connSeq++}`;
    return {
      async connect() {
        participants.set(connKey, self);
        codeOf.set(opts.selfId, opts.code);
        self.alive = true;
        // il partecipante non-host è iscritto al proprio uplink
        if (opts.role !== 'host') self.uplinks.add(UPLINK(opts.code, opts.selfId));
        await new Promise(r => setTimeout(r, lat()));
        syncPresence();
      },

      async close() {
        if (!self.alive) return;
        self.alive = false;
        participants.delete(connKey);
        syncPresence();
      },

      sendIntent(env) {
        if (!self.alive) return;
        deliver(opts.selfId, UPLINK(opts.code, opts.selfId), env, false);
      },

      onHostMessage(cb) {
        self.hostCbs.add(cb);
        return () => self.hostCbs.delete(cb);
      },

      broadcast(env) {
        if (!self.alive) return;
        deliver(opts.selfId, DOWNLINK(opts.code), env, true);
      },

      async listenTo(participantId) {
        await new Promise(r => setTimeout(r, lat()));
        if (self.alive) self.uplinks.add(UPLINK(opts.code, participantId));
      },

      async unlisten(participantId) {
        self.uplinks.delete(UPLINK(opts.code, participantId));
      },

      onIntent(cb) {
        self.intentCbs.add(cb);
        return () => self.intentCbs.delete(cb);
      },

      onPresence(cb) {
        self.presenceCbs.add(cb);
        return () => self.presenceCbs.delete(cb);
      },
    };
  }

  return {
    createTransport,
    disconnect(selfId) {
      for (const p of participants.values()) {
        if (p.id === selfId && p.alive) p.alive = false;
      }
      syncPresence();
    },
    reconnect(selfId) {
      for (const p of participants.values()) {
        if (p.id === selfId && !p.alive) p.alive = true;
      }
      syncPresence();
    },
    get eventsSent() { return _sent; },
    get eventsDelivered() { return _delivered; },
  };
}
