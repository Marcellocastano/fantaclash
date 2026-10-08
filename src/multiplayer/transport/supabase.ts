import {
  ClientIntent,
  Envelope,
  HostMessage,
  isClientIntent,
  isHostMessage,
} from '../protocol';
import { PresenceEntry, RoomTransport, TransportOptions } from './types';

/**
 * Transport Supabase Realtime (Broadcast + Presence).
 *
 * - downlink condiviso `room:<code>`: trasmette solo l'host, tutti iscritti,
 *   presence con key=selfId e meta {id, role};
 * - uplink `room:<code>:up:<id>` per partecipante: iscritti solo lui e l'host;
 * - broadcast con self:false (l'host non riceve i propri messaggi);
 * - import dinamico di @supabase/supabase-js: niente bundle finché non serve.
 *
 * Vincoli misurati nello spike: i callback presence vanno registrati PRIMA
 * di subscribe(); su Node serve il WebSocket globale (Node >=22).
 */

type SupabaseClient = import('@supabase/supabase-js').SupabaseClient;
type RealtimeChannel = import('@supabase/supabase-js').RealtimeChannel;

const MSG_EVENT = 'msg';
const INTENT_EVENT = 'intent';

function subscribeChannel(ch: RealtimeChannel, onClosed: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    ch.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') resolve();
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        reject(new Error(`canale ${ch.topic}: ${status} ${err?.message ?? ''}`));
      } else if (status === 'CLOSED') {
        onClosed();
      }
    });
  });
}

export async function createSupabaseTransport(opts: TransportOptions): Promise<RoomTransport> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY mancanti: multiplayer non configurato');
  }
  const { createClient } = await import('@supabase/supabase-js');
  const client: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: {
      params: { eventsPerSecond: 20 },
      // heartbeat in un Web Worker: sopravvive al throttling delle schede
      // in background (opzione `worker` di realtime-js, se Worker esiste)
      ...(typeof Worker !== 'undefined' ? { worker: true } : {}),
    },
  });

  const downlinkTopic = `room:${opts.code}`;
  const uplinkTopic = `${downlinkTopic}:up:${opts.selfId}`;
  const intentCbs = new Set<(env: Envelope<ClientIntent>) => void>();
  const hostCbs = new Set<(env: Envelope<HostMessage>) => void>();
  const presenceCbs = new Set<(entries: PresenceEntry[]) => void>();
  const uplinkChans = new Map<string, RealtimeChannel>();

  const emitPresence = (ch: RealtimeChannel) => {
    const state = ch.presenceState<{ id: string; role: PresenceEntry['role'] }>();
    const entries: PresenceEntry[] = Object.entries(state).flatMap(([key, metas]) =>
      metas.map(m => ({ id: m.id ?? key, role: m.role }))
    );
    presenceCbs.forEach(cb => cb(entries));
  };

  // Downlink: i callback presence vanno registrati PRIMA di subscribe()
  const downlink = client.channel(downlinkTopic, {
    config: {
      broadcast: { self: false, ack: false },
      presence: { key: opts.selfId },
    },
  });
  downlink.on('presence', { event: 'sync' }, () => emitPresence(downlink));
  downlink.on('broadcast', { event: MSG_EVENT }, ({ payload }) => {
    const env = payload as Envelope<HostMessage>;
    if (env && typeof env.from === 'string' && isHostMessage(env.msg)) {
      hostCbs.forEach(cb => cb(env));
    }
  });

  // Uplink proprio (solo non-host): gli intenti escono di qui
  let uplink: RealtimeChannel | null = null;
  if (opts.role !== 'host') {
    uplink = client.channel(uplinkTopic, {
      config: { broadcast: { self: false, ack: false } },
    });
  }

  const transport: RoomTransport = {
    async connect() {
      await subscribeChannel(downlink, () => presenceCbs.forEach(cb => cb([])));
      if (uplink) {
        await subscribeChannel(uplink, () => presenceCbs.forEach(cb => cb([])));
      }
      await downlink.track({ id: opts.selfId, role: opts.role });
    },

    async close() {
      await client.removeAllChannels();
      client.realtime.disconnect();
    },

    sendIntent(env) {
      void uplink?.send({ type: 'broadcast', event: INTENT_EVENT, payload: env });
    },

    onHostMessage(cb) {
      hostCbs.add(cb);
      return () => hostCbs.delete(cb);
    },

    broadcast(env) {
      void downlink.send({ type: 'broadcast', event: MSG_EVENT, payload: env });
    },

    async listenTo(participantId) {
      const topic = `${downlinkTopic}:up:${participantId}`;
      if (uplinkChans.has(topic)) return;
      const ch = client.channel(topic, {
        config: { broadcast: { self: false, ack: false } },
      });
      ch.on('broadcast', { event: INTENT_EVENT }, ({ payload }) => {
        const env = payload as Envelope<ClientIntent>;
        if (env && typeof env.from === 'string' && isClientIntent(env.msg)) {
          intentCbs.forEach(cb => cb(env));
        }
      });
      uplinkChans.set(topic, ch);
      await subscribeChannel(ch, () => {});
    },

    async unlisten(participantId) {
      const topic = `${downlinkTopic}:up:${participantId}`;
      const ch = uplinkChans.get(topic);
      if (!ch) return;
      uplinkChans.delete(topic);
      await client.removeChannel(ch);
    },

    onIntent(cb) {
      intentCbs.add(cb);
      return () => intentCbs.delete(cb);
    },

    onPresence(cb) {
      presenceCbs.add(cb);
      return () => presenceCbs.delete(cb);
    },
  };

  return transport;
}
