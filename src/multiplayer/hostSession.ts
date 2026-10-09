import { Player } from '../types';
import { intervalTick, TickFn } from './clock/tick';
import {
  ABSENT_AFTER_MS,
  DECISION_TIMEOUT_MS,
  HASH_INTERVAL_MS,
  MATCH_SPEED,
  MAX_SPECTATORS,
  SHOOTOUT_ORDER_TIMEOUT_MS,
} from './constants';
import { computeTimeline, lastTick, MatchOptions, MatchResult, MatchSide, nextStop, Tactic } from '../domain/match';
import { findMatch, simulateBracketMatch } from '../domain/tournament';
import { resultHash } from './hash';
import { buildBotRecords } from './hostTournament';
import { RoomKeyPair, serialQueue, signPayload, verifyPayload } from './crypto';
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
  /** Coppia ECDSA dell'host: firma i messaggi e verifica gli intenti */
  hostKey?: RoomKeyPair;
  /** Libro di una stanza ripresa (token, espulsi, chiavi fissate) */
  initialBook?: HostBook;
  now?: () => number;
  tick?: TickFn;
  rng?: () => number;
  /** Ogni quante azioni trasmettere anche HASH */
  hashEvery?: number;
}

export interface HostSession {
  getState(): RoomState;
  /** Libro dei segreti (token, espulsi, chiavi fissate): per il salvataggio */
  getBook(): HostBook;
  subscribe(cb: (state: RoomState) => void): () => void;
  /** Intento del giocatore-host: passa dallo stesso handleIntent */
  submitLocal(intent: ClientIntent): void;
  /** Comando/azione di stanza: valida, numera, applica e trasmette */
  dispatch(action: RoomAction): boolean;
  kick(playerId: string): void;
  updateSettings(settings: Partial<RoomSettings>): void;
  startAuction(pool: Player[]): void;
  /** Uscita volontaria: ROOM_CLOSED a tutti, poi destroy */
  closeRoom(): Promise<void>;
  destroy(): Promise<void>;
}

export function createHostSession({
  transport,
  initialState,
  hostToken,
  hostKey,
  initialBook,
  now = Date.now,
  tick = intervalTick,
  rng = Math.random,
  hashEvery = 20,
}: HostSessionOptions): HostSession {
  let state = initialState;
  let book: HostBook = initialBook ?? createHostBook();
  // L'host è un giocatore come gli altri: token registrato al via
  book.tokens[state.hostId] = hostToken;
  if (hostKey) book.publicKeys[state.hostId] = hostKey.publicJwk;

  // Firma in trasmissione e verifica in ricezione, serializzate per
  // mantenere l'ordine (ACTION per rev, intenti per mittente)
  const signQueue = serialQueue();
  const verifyQueues = new Map<string, (fn: () => Promise<void>) => void>();
  const queueFor = (id: string) => {
    let q = verifyQueues.get(id);
    if (!q) verifyQueues.set(id, (q = serialQueue()));
    return q;
  };

  const listeners = new Set<(s: RoomState) => void>();
  const lastSeen = new Map<string, number>();
  /** Presenti all'ultimo sync di presence: LISTENING è edge-triggered,
   *  così chi rientra dopo una disconnessione riceve un nuovo LISTENING */
  const present = new Set<string>();
  /** Spettatori nell'ultimo sync di presence (tetto MAX_SPECTATORS) */
  let spectatorCount = 0;
  const cleanups: (() => void)[] = [];
  /** true quando il turno ha avuto partite live: i record dei bot partono a fine turno */
  let liveRoundPending = false;

  const emit = () => listeners.forEach(cb => cb(state));

  function snapshotReply(to: string): HostMessage {
    return {
      type: 'SNAPSHOT',
      rev: state.rev,
      state,
      hash: stateHash(state),
      hostNow: now(),
      to,
      hostPubKey: hostKey?.publicJwk,
    };
  }

  function broadcast(msg: HostMessage) {
    if (!hostKey) {
      transport.broadcast({ from: state.hostId, msg });
      return;
    }
    signQueue(async () => {
      const sig = await signPayload(hostKey.privateJwk, msg);
      transport.broadcast({ from: state.hostId, msg, sig });
    });
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

  // Intenti dagli uplink dei partecipanti: verifica della firma con la
  // chiave fissata per quel mittente (per HELLO quella auto-dichiarata);
  // env.from è attribuito dal trasporto (uplink di provenienza) e deve
  // coincidere con il proprietario della chiave.
  cleanups.push(
    transport.onIntent((env: Envelope<ClientIntent>) => {
      const from = env.from;
      queueFor(from)(async () => {
        try {
          if (!hostKey) return routeIntent(from, env.msg);
          // HELLO si autofirma con la chiave dichiarata nel messaggio
          const key = env.msg.type === 'HELLO' ? env.msg.pubKey : book.publicKeys[from];
          if (!key || !env.sig) return; // niente chiave/firma: scarta
          if (!(await verifyPayload(key, env.sig, env.msg))) return;
          routeIntent(from, env.msg);
        } catch (e) {
          // un intento malformato non deve bloccare la coda del mittente
          console.error('[host] intento non gestito', e);
        }
      });
    })
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

  /**
   * Driver delle partite live (~200 ms): nessun tick viaggia in rete.
   * Per ogni partita: allo stop corrente aspetta le scelte umane o il
   * timeout e manda MATCH_RESUME; a fine partita manda MATCH_RECORD con
   * le opzioni accumulate; a turno chiuso registra le partite tra bot.
   */
  // Simulare costa: il risultato cambia solo quando cambiano le opzioni
  const resultCache = new Map<string, { key: string; result: MatchResult }>();

  function checkLiveMatches() {
    if (state.phase !== 'tournament' || !state.tournament) {
      liveRoundPending = false;
      resultCache.clear();
      return;
    }
    const t = now();
    for (const [matchId, live] of Object.entries(state.live)) {
      const options: MatchOptions = { tactics: live.plans, shootoutOrder: live.shootoutOrder };
      const key = JSON.stringify(options);
      let result = resultCache.get(matchId)?.key === key ? resultCache.get(matchId)!.result : null;
      if (!result) {
        result = simulateBracketMatch(state.tournament, state.teams, matchId, options);
        resultCache.set(matchId, { key, result });
      }
      const stop = nextStop(result, live.anchorTick, live.resolvedStops, live.humanSides.length > 0);
      const { reachedStopAt } = computeTimeline({
        result,
        anchorTick: live.anchorTick,
        anchorAt: live.anchorAt,
        now: t,
        speed: MATCH_SPEED,
        stopTick: stop,
      });
      if (reachedStopAt === null) continue;
      if (stop >= lastTick(result)) {
        const rest = { ...book.matchChoices };
        delete rest[matchId];
        book = { ...book, matchChoices: rest };
        dispatch({
          type: 'MATCH_RECORD',
          matchId,
          seed: findMatch(state.tournament.bracket, matchId)!.seed,
          options,
          resultHash: resultHash(result),
        });
        continue;
      }
      const isShootoutStop = !!result.shootout && stop === result.fullTimeTick;
      const timeout = isShootoutStop ? SHOOTOUT_ORDER_TIMEOUT_MS : DECISION_TIMEOUT_MS;
      const choices = book.matchChoices[matchId];
      const allChosen = live.humanSides.every(side =>
        isShootoutStop ? !!choices?.orders[side] : choices?.tactics[side]?.stopTick === stop
      );
      if (!allChosen && t < reachedStopAt + timeout) continue;
      // Riprende: pubblica le scelte raccolte (chi non ha scelto: invariato/automatico)
      const tactics: Partial<Record<MatchSide, Tactic>> = {};
      if (!isShootoutStop) {
        for (const side of live.humanSides) {
          const c = choices?.tactics[side];
          if (c?.stopTick === stop) tactics[side] = c.tactic;
        }
      }
      const orders = isShootoutStop ? choices?.orders : undefined;
      const resume: RoomAction = {
        type: 'MATCH_RESUME',
        matchId,
        stopTick: stop,
        at: t,
        tactics: Object.keys(tactics).length ? tactics : undefined,
        shootoutOrder: orders && Object.keys(orders).length ? orders : undefined,
      };
      const pending = book.matchChoices[matchId];
      if (pending) {
        book = { ...book, matchChoices: { ...book.matchChoices, [matchId]: { tactics: {}, orders: {} } } };
      }
      dispatch(resume);
    }
    // Partite tra soli bot del turno: si registrano quando le live finiscono
    if (Object.keys(state.live).length === 0) {
      if (liveRoundPending) {
        liveRoundPending = false;
        for (const a of buildBotRecords(state)) dispatch(a);
      }
    } else {
      liveRoundPending = true;
    }
  }

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

  // Partite live: scadenze delle decisioni e registrazione dei risultati
  cleanups.push(tick(checkLiveMatches, 200));

  // HASH periodico: senza di esso un'azione persa in coda al flusso non
  // verrebbe mai scoperta dal client (nessun rev successivo a rivelare il buco)
  cleanups.push(
    tick(() => {
      broadcast({ type: 'HASH', rev: state.rev, hash: stateHash(state) });
    }, HASH_INTERVAL_MS)
  );

  return {
    getState: () => state,

    getBook: () => book,

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

    async closeRoom() {
      const msg: HostMessage = { type: 'ROOM_CLOSED' };
      // firmato e spedito in modo sincrono: il canale chiude subito dopo
      const sig = hostKey ? await signPayload(hostKey.privateJwk, msg) : undefined;
      transport.broadcast({ from: state.hostId, msg, sig });
      // il broadcast è fire-and-forget: lascia al socket il tempo di spedire
      await new Promise(r => setTimeout(r, 300));
      await this.destroy();
    },

    async destroy() {
      cleanups.forEach(fn => fn());
      await transport.close();
    },
  };
}
