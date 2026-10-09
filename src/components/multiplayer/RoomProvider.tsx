import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, ReactNode } from 'react';
import { createClientSession, ClientSession } from '../../multiplayer/clientSession';
import { createHostSession, HostSession } from '../../multiplayer/hostSession';
import { createRoom } from '../../multiplayer/roomReducer';
import { generateRoomCode } from '../../multiplayer/roomCode';
import { ensureRoomIdentity, getRoomIdentity } from '../../multiplayer/identity';
import { attachHostSaver, clearHostSave, deserializeBook, loadHostSave } from '../../multiplayer/hostPersistence';
import { createWorkerTick } from '../../multiplayer/clock/workerTick';
import { createSupabaseTransport } from '../../multiplayer/transport/supabase';
import { RoomTransport, TransportOptions } from '../../multiplayer/transport/types';
import { ClientIntent, RejectReason, RoomAction, RoomSettings, RoomState } from '../../multiplayer/protocol';
import { RoomKeyPair } from '../../multiplayer/crypto';
import { Player } from '../../types';

/**
 * Possesso React della sessione di stanza (host o client).
 * La sessione vive in un ref; lo stato arriva via subscribe e si espone
 * con useSyncExternalStore. Il trasporto è iniettabile per i test.
 */

export type TransportFactory = (opts: TransportOptions) => Promise<RoomTransport>;
export type RoomRole = 'host' | 'player' | 'spectator';
export type RoomStatus = 'idle' | 'connecting' | 'joining' | 'ready' | 'rejected' | 'closed';

export interface CreateRoomInput {
  nickname: string;
  teamName: string;
  settings: RoomSettings;
}

export interface JoinRoomInput {
  code: string;
  nickname: string;
  teamName: string;
  role: 'player' | 'spectator';
}

interface RoomSnapshot {
  status: RoomStatus;
  rejectReason: RejectReason | null;
  state: RoomState | null;
  role: RoomRole | null;
  me: string | null;
  spectatorCount: number;
  /** false sui client quando l'host non è in presence (banner di attesa) */
  hostOnline: boolean;
  /** true dopo ROOM_CLOSED: la stanza è stata chiusa dall'host */
  roomClosed: boolean;
}

const IDLE: RoomSnapshot = {
  status: 'idle',
  rejectReason: null,
  state: null,
  role: null,
  me: null,
  spectatorCount: 0,
  hostOnline: true,
  roomClosed: false,
};

export interface RoomContextValue extends RoomSnapshot {
  isHost: boolean;
  createRoom(input: CreateRoomInput): Promise<void>;
  joinRoom(input: JoinRoomInput): Promise<void>;
  /** Riprende una stanza host salvata (ricarica della pagina) */
  resumeRoom(code: string): Promise<void>;
  leave(): Promise<void>;
  /** Uscita volontaria dell'host: avvisa tutti e cancella il salvataggio */
  closeRoom(): Promise<void>;
  sendIntent(intent: ClientIntent): void;
  hostNow(): number;
  /** Solo host */
  kick(playerId: string): void;
  updateSettings(settings: Partial<RoomSettings>): void;
  startAuction(pool: Player[]): void;
  /** Solo host: dispaccia un'azione di stanza autorevole (false su client/rifiuto) */
  dispatchRoomAction(action: RoomAction): boolean;
}

const RoomContext = createContext<RoomContextValue | null>(null);

/** Codice libero se nessun 'host' compare in presence entro l'attesa */
const COLLISION_WAIT_MS = 1500;
const COLLISION_TRIES = 3;

/** Chiave pubblica dell'host fissata (TOFU) per codice stanza */
const hostKeyFor = (code: string) => `fanta-fc-room-hostkey-${code}`;

function readHostKey(code: string): JsonWebKey | null {
  try {
    const raw = localStorage.getItem(hostKeyFor(code));
    return raw ? (JSON.parse(raw) as JsonWebKey) : null;
  } catch {
    return null;
  }
}

function writeHostKey(code: string, key: JsonWebKey): void {
  try {
    localStorage.setItem(hostKeyFor(code), JSON.stringify(key));
  } catch {
    // il pin vale per questa sessione
  }
}

export function RoomProvider({
  transportFactory = createSupabaseTransport,
  children,
}: {
  transportFactory?: TransportFactory;
  children: ReactNode;
}) {
  const sessionRef = useRef<HostSession | ClientSession | null>(null);
  const snapRef = useRef<RoomSnapshot>(IDLE);
  const listenersRef = useRef(new Set<() => void>());
  const detachSaverRef = useRef<(() => void) | null>(null);

  const notify = useCallback((snap: RoomSnapshot) => {
    snapRef.current = snap;
    listenersRef.current.forEach(cb => cb());
  }, []);

  /** Spettatori e presenza dell'host dalla presence */
  const watchPresence = useCallback((transport: RoomTransport, role: RoomRole) => {
    transport.onPresence(entries => {
      const n = entries.filter(e => e.role === 'spectator').length;
      const hostOn = role === 'host' ? true : entries.some(e => e.role === 'host');
      if (snapRef.current.spectatorCount !== n || snapRef.current.hostOnline !== hostOn) {
        notify({ ...snapRef.current, spectatorCount: n, hostOnline: hostOn });
      }
    });
  }, [notify]);

  const subscribe = useCallback((cb: () => void) => {
    listenersRef.current.add(cb);
    return () => listenersRef.current.delete(cb);
  }, []);

  const getSnapshot = useCallback(() => snapRef.current, []);
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  /** Avvia la sessione host da stato + libro (creazione o ripresa) */
  const startHostSession = useCallback(async (
    code: string,
    state: RoomState,
    hostKey: RoomKeyPair,
    initialBook?: ReturnType<typeof deserializeBook>,
    timeShift = 0
  ) => {
    const identity = getRoomIdentity(code);
    const transport = await transportFactory({
      code,
      selfId: identity.participantId,
      role: 'host',
      pubKey: hostKey.publicJwk,
    });
    watchPresence(transport, 'host');
    await transport.connect();
    const session = createHostSession({
      transport,
      initialState: state,
      hostToken: identity.token,
      hostKey,
      initialBook,
      tick: createWorkerTick(),
    });
    sessionRef.current = session;
    detachSaverRef.current = attachHostSaver(session, hostKey);
    session.subscribe(s =>
      notify({ ...snapRef.current, status: 'ready', rejectReason: null, state: s, role: 'host', me: identity.participantId })
    );
    notify({ ...snapRef.current, status: 'ready', rejectReason: null, state, role: 'host', me: identity.participantId });
    if (timeShift > 0) session.dispatch({ type: 'TIME_SHIFT', by: timeShift });
  }, [transportFactory, notify, watchPresence]);

  const createRoomSession = useCallback(async (input: CreateRoomInput) => {
    for (let attempt = 0; attempt < COLLISION_TRIES; attempt++) {
      const code = generateRoomCode();
      const identity = await ensureRoomIdentity(code, { nickname: input.nickname, teamName: input.teamName });
      const hostKey = identity.keyPair!;
      const transport = await transportFactory({
        code,
        selfId: identity.participantId,
        role: 'host',
        pubKey: hostKey.publicJwk,
      });
      watchPresence(transport, 'host');
      await transport.connect();
      // Collisione: se nella presence c'è già un altro host, rigenera il codice
      let occupied = false;
      const off = transport.onPresence(entries => {
        if (entries.some(e => e.role === 'host' && e.id !== identity.participantId)) occupied = true;
      });
      await new Promise(r => setTimeout(r, COLLISION_WAIT_MS));
      off();
      if (occupied) {
        await transport.close();
        continue;
      }
      const initial = createRoom({
        code,
        hostId: identity.participantId,
        host: { nickname: input.nickname, teamName: input.teamName },
        settings: input.settings,
        now: Date.now(),
      });
      const session = createHostSession({
        transport,
        initialState: initial,
        hostToken: identity.token,
        hostKey,
        tick: createWorkerTick(),
      });
      sessionRef.current = session;
      detachSaverRef.current = attachHostSaver(session, hostKey);
      session.subscribe(state =>
        notify({ ...snapRef.current, status: 'ready', rejectReason: null, state, role: 'host', me: identity.participantId })
      );
      notify({ ...IDLE, status: 'ready', state: initial, role: 'host', me: identity.participantId });
      window.history.replaceState(null, '', `/multiplayer/?codice=${code}`);
      return;
    }
    throw new Error('Nessun codice libero trovato');
  }, [transportFactory, notify, watchPresence]);

  const resumeRoom = useCallback(async (code: string) => {
    const identity = await ensureRoomIdentity(code);
    const save = loadHostSave(code, identity.participantId);
    if (!save) throw new Error('Nessun salvataggio valido per questa stanza');
    const elapsed = Date.now() - save.savedAt;
    await startHostSession(code, save.state, save.hostKey, deserializeBook(save.book), elapsed);
  }, [startHostSession]);

  const joinRoom = useCallback(async (input: JoinRoomInput) => {
    // Un nuovo tentativo chiude la sessione precedente: niente presenze fantasma
    const prev = sessionRef.current;
    sessionRef.current = null;
    if (prev) await ('destroy' in prev ? prev.destroy() : prev.close());
    const identity = await ensureRoomIdentity(input.code, { nickname: input.nickname, teamName: input.teamName });
    notify({ ...IDLE, status: 'connecting', role: input.role, me: identity.participantId, hostOnline: false });
    const transport = await transportFactory({
      code: input.code,
      selfId: identity.participantId,
      role: input.role,
      pubKey: identity.keyPair?.publicJwk,
    });
    watchPresence(transport, input.role);
    const session = createClientSession({
      transport,
      identity,
      role: input.role,
      nickname: input.nickname,
      teamName: input.teamName,
      keyPair: identity.keyPair,
      knownHostKey: readHostKey(input.code) ?? undefined,
      tick: createWorkerTick(),
    });
    sessionRef.current = session;
    session.subscribe((state, status) => {
      const hostKey = session.getHostKey();
      if (hostKey) writeHostKey(input.code, hostKey);
      notify({
        ...snapRef.current,
        status,
        rejectReason: session.getRejectReason(),
        state,
        role: input.role,
        me: identity.participantId,
        roomClosed: session.isRoomClosed(),
      });
    });
    notify({ ...snapRef.current, status: session.getStatus(), rejectReason: null, state: null, role: input.role, me: identity.participantId });
    await session.connect();
  }, [transportFactory, notify, watchPresence]);

  // Dismissione del provider: chiude la sessione senza toccare l'URL
  useEffect(() => () => {
    const s = sessionRef.current;
    sessionRef.current = null;
    if (s) void ('destroy' in s ? s.destroy() : s.close());
  }, []);

  const leave = useCallback(async () => {
    const s = sessionRef.current;
    sessionRef.current = null;
    detachSaverRef.current?.();
    detachSaverRef.current = null;
    notify(IDLE);
    if (s && 'closeRoom' in s) {
      clearHostSave(s.getState().code);
      await s.closeRoom();
    } else if (s) {
      await s.close();
    }
    window.history.replaceState(null, '', '/multiplayer/');
  }, [notify]);

  const closeRoom = leave; // stessa operazione: il dialogo la rende esplicita

  const value = useMemo<RoomContextValue>(() => ({
    ...snap,
    isHost: snap.role === 'host',
    createRoom: createRoomSession,
    joinRoom,
    resumeRoom,
    leave,
    closeRoom,
    sendIntent(intent) {
      const s = sessionRef.current;
      if (!s) return;
      if ('submitLocal' in s) s.submitLocal(intent);
      else s.sendIntent(intent);
    },
    hostNow() {
      const s = sessionRef.current;
      return s && 'hostNow' in s ? s.hostNow() : Date.now();
    },
    kick(id) { const s = sessionRef.current; if (s && 'kick' in s) s.kick(id); },
    updateSettings(p) { const s = sessionRef.current; if (s && 'updateSettings' in s) s.updateSettings(p); },
    startAuction(pool) { const s = sessionRef.current; if (s && 'startAuction' in s) s.startAuction(pool); },
    dispatchRoomAction(action) {
      const s = sessionRef.current;
      return s && 'dispatch' in s ? s.dispatch(action) : false;
    },
  }), [snap, createRoomSession, joinRoom, resumeRoom, leave, closeRoom]);

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom fuori da RoomProvider');
  return ctx;
}
