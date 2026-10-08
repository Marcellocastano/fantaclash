import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuctionController, TeamMeta } from '../../hooks/auctionController';
import { deriveAuctionView } from '../../services/auction';
import { projectForViewer } from '../../multiplayer/view';
import { createWorkerTick } from '../../multiplayer/clock/workerTick';
import { Player } from '../../types';
import { useRoom } from './RoomProvider';

/** Frequenza di refresh dell'orologio host durante lotto/turno (ms) */
const VIEW_TICK_MS = 100;
const VIEW_TICK = createWorkerTick();

/**
 * Controller d'asta di stanza: la vista è derivata dalla proiezione dello
 * stato autorevole dell'host (orologio sincronizzato), le azioni utente
 * diventano intenti CALL/BID. Niente simulazioni né avanzamenti manuali:
 * il ritmo lo detta il driver dell'host.
 */
export function useRoomAuction(): AuctionController {
  const room = useRoom();
  const state = room.state;
  const me = room.me;

  const roomRef = useRef(room);
  roomRef.current = room;

  const world = useMemo(
    () =>
      state?.auction
        ? { ...projectForViewer(state, me), auction: state.auction }
        : null,
    [state, me]
  );
  const teams = world?.teams ?? [];
  const myTeamId = world?.myTeamId ?? null;

  // Orologio dell'host, aggiornato dal worker mentre c'è qualcosa di vivo
  const [now, setNow] = useState(() => room.hostNow());
  const live =
    !!state?.auction &&
    (state.auction.phase === 'bidding' || state.auction.phase === 'calling');
  useEffect(() => {
    if (!live) return;
    setNow(roomRef.current.hostNow());
    return VIEW_TICK(() => setNow(roomRef.current.hostNow()), VIEW_TICK_MS);
  }, [live]);

  const view = useMemo(
    () => deriveAuctionView(world, myTeamId, now),
    [world, myTeamId, now]
  );

  // Chi controlla ogni squadra: nickname del proprietario + stato connessione
  const teamMeta = useMemo<Record<string, TeamMeta> | undefined>(() => {
    if (!state) return undefined;
    const meta: Record<string, TeamMeta> = {};
    for (const t of state.teams) {
      const owner = t.ownerId
        ? state.players.find(p => p.id === t.ownerId)
        : undefined;
      meta[t.id] = {
        nickname: owner?.nickname,
        controller: t.controller ?? (t.ownerId ? 'human' : 'bot'),
        connected: owner ? owner.connected : true,
      };
    }
    return meta;
  }, [state]);

  const noop = useCallback(() => {}, []);
  const userCallPlayer = useCallback((p: Player) => {
    roomRef.current.sendIntent({ type: 'CALL', footballerId: p.id });
    return true;
  }, []);
  const userBid = useCallback((amount: number) => {
    roomRef.current.sendIntent({ type: 'BID', amount });
    return true;
  }, []);

  return {
    ...view,
    canSimulateLot: false,
    canSimulateRole: false,
    teams,
    season: state?.settings.season,
    allowSimulation: false,
    teamMeta,
    callDeadline: state?.callDeadline ?? null,
    now,
    startAuction: noop,
    userCallPlayer,
    userBid,
    confirmAssignment: noop,
    continueToNextRole: noop,
    simulateLot: noop,
    simulateRoleCompletion: noop,
    simulateAll: noop,
  };
}
