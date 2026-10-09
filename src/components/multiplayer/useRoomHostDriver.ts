import { useCallback, useRef } from 'react';
import { useAuctionDriver } from '../../hooks/useAuctionDriver';
import { AuctionAction } from '../../services/auction';
import { createWorkerTick } from '../../multiplayer/clock/workerTick';
import { BID_GRACE_MS, CALL_TIMEOUT_MS } from '../../multiplayer/constants';
import { TickFn } from '../../multiplayer/clock/tick';
import { useRoom } from './RoomProvider';

// Stabili tra i render: se ricreati a ogni render il ticker del driver
// ripartirebbe di continuo (e il setState dell'effetto andrebbe in loop)
const ROOM_TICK: TickFn = createWorkerTick();
const AUTO_ADVANCE = { soldMs: 2000, roleMs: 3000 };

/**
 * Driver d'asta autorevole della stanza: gira SOLO sull'host durante la
 * fase 'auction'. Chiude i lotti con tolleranza di rete, avanza da solo
 * dopo vendite e reparti, e chiama al posto di un umano che va oltre il
 * timeout (notificando a tutti la scadenza con CALL_DEADLINE).
 */
export function useRoomHostDriver(suspended = false): void {
  const room = useRoom();
  const state = room.state;

  // Ref per callback stabili: il valore del context cambia a ogni revisione
  const roomRef = useRef(room);
  roomRef.current = room;

  const dispatchAction = useCallback(
    (action: AuctionAction): boolean =>
      roomRef.current.dispatchRoomAction({ type: 'AUCTION', action }),
    []
  );

  const onHumanCallTurn = useCallback(
    (deadline: number | null) => {
      roomRef.current.dispatchRoomAction({ type: 'CALL_DEADLINE', deadline });
    },
    []
  );

  useAuctionDriver({
    world: state?.auction ? { teams: state.teams, auction: state.auction } : null,
    dispatchAction,
    enabled: room.isHost && !suspended && state?.phase === 'auction',
    tick: ROOM_TICK,
    closeGraceMs: BID_GRACE_MS,
    autoAdvance: AUTO_ADVANCE,
    humanCallTimeoutMs: CALL_TIMEOUT_MS,
    onHumanCallTurn,
  });
}
