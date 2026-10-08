import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, ReactNode } from 'react';
import { createClientSession, ClientSession } from '../../multiplayer/clientSession';
import { createHostSession, HostSession } from '../../multiplayer/hostSession';
import { createRoom } from '../../multiplayer/roomReducer';
import { generateRoomCode } from '../../multiplayer/roomCode';
import { getRoomIdentity } from '../../multiplayer/identity';
import { createWorkerTick } from '../../multiplayer/clock/workerTick';
import { createSupabaseTransport } from '../../multiplayer/transport/supabase';
import { RoomTransport, TransportOptions } from '../../multiplayer/transport/types';
import { ClientIntent, RejectReason, RoomAction, RoomSettings, RoomState } from '../../multiplayer/protocol';
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
}

const IDLE: RoomSnapshot = { status: 'idle', rejectReason: null, state: null, role: null, me: null, spectatorCount: 0 };

export interface RoomContextValue extends RoomSnapshot {
  isHost: boolean;
  createRoom(input: CreateRoomInput): Promise<void>;
  joinRoom(input: JoinRoomInput): Promise<void>;
  leave(): Promise<void>;
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

  const notify = useCallback((snap: RoomSnapshot) => {
    snapRef.current = snap;
    listenersRef.current.forEach(cb => cb());
  }, []);

  /** Aggiorna solo il numero di spettatori dalla presence */
  const watchSpectators = useCallback((transport: RoomTransport) => {
    transport.onPresence(entries => {
      const n = entries.filter(e => e.role === 'spectator').length;
      if (snapRef.current.spectatorCount !== n) {
        notify({ ...snapRef.current, spectatorCount: n });
      }
    });
  }, [notify]);

  const subscribe = useCallback((cb: () => void) => {
    listenersRef.current.add(cb);
    return () => listenersRef.current.delete(cb);
  }, []);

  const getSnapshot = useCallback(() => snapRef.current, []);
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const createRoomSession = useCallback(async (input: CreateRoomInput) => {
    for (let attempt = 0; attempt < COLLISION_TRIES; attempt++) {
      const code = generateRoomCode();
      const identity = getRoomIdentity(code);
      const transport = await transportFactory({ code, selfId: identity.participantId, role: 'host' });
      watchSpectators(transport);
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
        tick: createWorkerTick(),
      });
      sessionRef.current = session;
      session.subscribe(state =>
        notify({ ...snapRef.current, status: 'ready', rejectReason: null, state, role: 'host', me: identity.participantId })
      );
      notify({ status: 'ready', rejectReason: null, state: initial, role: 'host', me: identity.participantId, spectatorCount: 0 });
      window.history.replaceState(null, '', `/multiplayer/?codice=${code}`);
      return;
    }
    throw new Error('Nessun codice libero trovato');
  }, [transportFactory, notify, watchSpectators]);

  const joinRoom = useCallback(async (input: JoinRoomInput) => {
    const identity = getRoomIdentity(input.code);
    notify({ status: 'connecting', rejectReason: null, state: null, role: input.role, me: identity.participantId, spectatorCount: 0 });
    const transport = await transportFactory({ code: input.code, selfId: identity.participantId, role: input.role });
    watchSpectators(transport);
    const session = createClientSession({
      transport,
      identity,
      role: input.role,
      nickname: input.nickname,
      teamName: input.teamName,
      tick: createWorkerTick(),
    });
    sessionRef.current = session;
    session.subscribe((state, status) =>
      notify({ ...snapRef.current, status, rejectReason: session.getRejectReason(), state, role: input.role, me: identity.participantId })
    );
    notify({ status: session.getStatus(), rejectReason: null, state: null, role: input.role, me: identity.participantId, spectatorCount: 0 });
    await session.connect();
  }, [transportFactory, notify, watchSpectators]);

  // Dismissione del provider: chiude la sessione senza toccare l'URL
  useEffect(() => () => {
    const s = sessionRef.current;
    sessionRef.current = null;
    if (s) void ('destroy' in s ? s.destroy() : s.close());
  }, []);

  const leave = useCallback(async () => {
    const s = sessionRef.current;
    sessionRef.current = null;
    notify(IDLE);
    if (s) await ('destroy' in s ? s.destroy() : s.close());
    window.history.replaceState(null, '', '/multiplayer/');
  }, [notify]);

  const value = useMemo<RoomContextValue>(() => ({
    ...snap,
    isHost: snap.role === 'host',
    createRoom: createRoomSession,
    joinRoom,
    leave,
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
  }), [snap, createRoomSession, joinRoom, leave]);

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom fuori da RoomProvider');
  return ctx;
}
