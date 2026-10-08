import { Player } from '../types';
import { intervalTick, TickFn } from './clock/tick';
import {
  ABSENT_AFTER_MS,
  MAX_SPECTATORS,
} from './constants';
import { stateHash } from './hash';
import {
  buildStartAuction,
  buildStartCalling,
  createHostBook,
  handleIntent,
  HostBook,
} from './host';
import {
  ClientIntent,
  Envelope,
  HostMessage,
  RoomAction,
  RoomSettings,
  RoomState,
} from './protocol';
import { applyHostAction } from './roomReducer';
import { RoomTransport } from './transport/types';

/**
 * Sessione dell'host: unico scrittore della stanza. Riceve gli intenti
 * dagli uplink, li traduce in azioni numerate (rev) e le trasmette sul
 * downlink. L'host non riceve i propri broadcast (self:false), quindi
 * applica le azioni in locale prima di trasmetterle.
 * Pura: niente React; il tempo e l'rng sono iniettabili.
 */

export interface HostSessionOptions {
  transport: RoomTransport;
  initialState: RoomState;
  /** Token segreto dell'host-giocatore (stesso meccanismo dei client) */
  hostToken: string;
  now?: () => number;
  tick?: TickFn;
  rng?: () => number;
  /** Ogni quante azioni trasmettere anche HASH */
  hashEvery?: number;
}

export interface HostSession {
  getState(): RoomState;
  subscribe(cb: (state: RoomState) => void): () => void;
  /** Intento del giocatore-host: passa dallo stesso handleIntent */
  submitLocal(intent: ClientIntent): void;
  /** Comando/azione di stanza: valida, numera, applica e trasmette */
  dispatch(action: RoomAction): boolean;
  kick(playerId: string): void;
  updateSettings(settings: Partial<RoomSettings>): void;
  startAuction(pool: Player[]): void;
  destroy(): Promise<void>;
}

export function createHostSession({
  transport,
  initialState,
  hostToken,
  now = Date.now,
  tick = intervalTick,
  rng = Math.random,
  hashEvery = 20,
}: HostSessionOptions): HostSession {
  let state = initialState;
  let book: HostBook = createHostBook();
  // L'host è un giocatore come gli altri: token registrato al via
  book.tokens[state.hostId] = hostToken;

  const listeners = new Set<(s: RoomState) => void>();
  const lastSeen = new Map<string, number>();
  /** Presenti all'ultimo sync di presence: LISTENING è edge-triggered,
   *  così chi rientra dopo una disconnessione riceve un nuovo LISTENING */
  const present = new Set<string>();
  /** Spettatori nell'ultimo sync di presence (tetto MAX_SPECTATORS) */
  let spectatorCount = 0;
  const cleanups: (() => void)[] = [];

  const emit = () => listeners.forEach(cb => cb(state));

  function snapshotReply(to: string): HostMessage {
    return { type: 'SNAPSHOT', rev: state.rev, state, hash: stateHash(state), hostNow: now(), to };
  }

  function broadcast(msg: HostMessage) {
    transport.broadcast({ from: state.hostId, msg });
  }

  function dispatch(action: RoomAction): boolean {
    const rev = state.rev + 1;
    const next = applyHostAction(state, rev, action);
    if (next === state) return false;
    state = next;
    broadcast({ type: 'ACTION', rev, action, hostNow: now() });
    if (rev % hashEvery === 0) {
      broadcast({ type: 'HASH', rev, hash: stateHash(state) });
    }
    emit();
    return true;
  }

  function routeIntent(from: string, intent: ClientIntent) {
    lastSeen.set(from, now());
    // Segnato assente ma di nuovo attivo (es. scheda tornata in primo piano,
    // presence mai caduta): nuovo LISTENING -> il client rimanda HELLO col token
    if (intent.type !== 'HELLO' && state.players.some(p => p.id === from && !p.connected)) {
      broadcast({ type: 'LISTENING', to: from });
    }
    const r = handleIntent(state, book, from, intent, now(), rng);
    book = r.book;
    for (const action of r.actions) dispatch(action);
    for (const reply of r.replies) broadcast(reply);
    if (intent.type === 'HELLO' && intent.role === 'player') {
      const joined = r.actions.some(
        a => (a.type === 'PLAYER_JOINED' || a.type === 'PLAYER_CONNECTION')
      );
      const rejected = r.replies.some(m => m.type === 'REJECT');
      if (joined && !rejected) broadcast(snapshotReply(from));
    } else if (intent.type === 'HELLO' && intent.role === 'spectator') {
      // chi manda HELLO è già nella presence: rifiuta solo oltre il tetto
      if (spectatorCount > MAX_SPECTATORS) {
        broadcast({ type: 'REJECT', to: from, reason: 'full' });
      } else {
        broadcast(snapshotReply(from));
      }
    }
  }

  // Intenti dagli uplink dei partecipanti
  cleanups.push(
    transport.onIntent((env: Envelope<ClientIntent>) => routeIntent(env.from, env.msg))
  );

  // Presence: nuovo partecipante -> listenTo + LISTENING; uscita -> disconnesso
  cleanups.push(
    transport.onPresence(entries => {
      spectatorCount = entries.filter(e => e.role === 'spectator').length;
      const nowPresent = new Set(entries.map(e => e.id));
      for (const id of nowPresent) {
        if (id === state.hostId || present.has(id)) continue;
        void transport.listenTo(id).then(() =>
          broadcast({ type: 'LISTENING', to: id })
        );
      }
      present.clear();
      nowPresent.forEach(id => present.add(id));
      for (const p of state.players) {
        if (p.id === state.hostId) continue;
        if (p.connected && !present.has(p.id)) {
          dispatch({ type: 'PLAYER_CONNECTION', playerId: p.id, connected: false });
        }
      }
    })
  );

  // Assenza applicativa: chi non si fa sentire da troppo è disconnesso
  cleanups.push(
    tick(() => {
      const t = now();
      for (const p of state.players) {
        if (p.id === state.hostId || !p.connected) continue;
        const seen = lastSeen.get(p.id);
        if (seen !== undefined && t - seen > ABSENT_AFTER_MS) {
          dispatch({ type: 'PLAYER_CONNECTION', playerId: p.id, connected: false });
        }
      }
    }, 1000)
  );

  return {
    getState: () => state,

    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    submitLocal(intent) {
      routeIntent(state.hostId, intent);
    },

    dispatch,

    kick(playerId) {
      book = { ...book, kicked: new Set(book.kicked).add(playerId) };
      broadcast({ type: 'REJECT', to: playerId, reason: 'kicked' });
      dispatch({ type: 'PLAYER_KICKED', playerId });
    },

    updateSettings(settings) {
      dispatch({ type: 'SETTINGS', settings });
    },

    startAuction(pool) {
      const start = buildStartAuction(state, pool, rng);
      if (!start || !dispatch(start)) return;
      dispatch(buildStartCalling(state, rng));
    },

    async destroy() {
      cleanups.forEach(fn => fn());
      await transport.close();
    },
  };
}
