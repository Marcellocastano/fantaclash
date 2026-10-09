import { useEffect, useMemo, useRef, useState } from 'react';
import {
  computeTimeline,
  getPlaybackState,
  MatchSide,
  nextStop,
  Tactic,
  TICK_MS,
} from '../../domain/match';
import { simulateBracketMatch } from '../../domain/tournament';
import { MatchPlayback } from '../../hooks/useMatchPlayback';
import { createWorkerTick } from '../../multiplayer/clock/workerTick';
import { DECISION_TIMEOUT_MS, MATCH_SPEED, SHOOTOUT_ORDER_TIMEOUT_MS } from '../../multiplayer/constants';
import { projectForViewer } from '../../multiplayer/view';
import { useRoom } from './RoomProvider';

const TICK_VIEW_MS = 100;
const VIEW_TICK = createWorkerTick();
const noop = () => {};

/**
 * Playback di una partita live della stanza: stessa forma di
 * useMatchPlayback, ma il tick arriva dalla timeline deterministica
 * ancorata all'orologio dell'host. Velocità fissa MATCH_SPEED, nessun
 * controllo locale. Le scelte partono come intenti segreti verso l'host.
 */
export function useRoomMatchPlayback(matchId: string, userSide: MatchSide | null): MatchPlayback {
  const room = useRoom();
  const state = room.state;
  const live = state?.live[matchId];

  const projection = useMemo(
    () => (state ? projectForViewer(state, room.me) : null),
    [state, room.me]
  );
  const tournament = projection?.tournament ?? null;
  const teams = projection?.teams ?? [];

  // Le opzioni accumulate della partita live (piani + ordini dei rigori)
  const options = useMemo(
    () => (live ? { tactics: live.plans, shootoutOrder: live.shootoutOrder } : {}),
    [live]
  );
  const result = useMemo(
    () => (tournament && teams.length && live ? simulateBracketMatch(tournament, teams, matchId, options) : null),
    [tournament, teams, matchId, options, live]
  );

  // Orologio dell'host aggiornato a 100 ms mentre la partita è live
  const roomRef = useRef(room);
  roomRef.current = room;
  const [now, setNow] = useState(() => room.hostNow());
  useEffect(() => {
    if (!live) return;
    setNow(roomRef.current.hostNow());
    return VIEW_TICK(() => setNow(roomRef.current.hostNow()), TICK_VIEW_MS);
  }, [live]);

  const displaySide = userSide ?? 'home';
  const stop = result && live ? nextStop(result, live.anchorTick, live.resolvedStops, true) : 0;
  const { tick, reachedStopAt } =
    result && live
      ? computeTimeline({
          result,
          anchorTick: live.anchorTick,
          anchorAt: live.anchorAt,
          now,
          speed: MATCH_SPEED,
          stopTick: stop,
        })
      : { tick: 0, reachedStopAt: null };

  const isDecisionStop = !!result && result.decisionTicks.includes(stop + 1);
  const isShootoutStop = !!result && !!result.shootout && stop === result.fullTimeTick;
  const isHumanSide = !!live && !!userSide && live.humanSides.includes(userSide);

  // Scelta inviata per lo stop corrente: si resetta quando lo stop cambia
  const [sentFor, setSentFor] = useState<number | null>(null);
  const choiceSent = sentFor === stop;

  // L'overlay resta visibile anche dopo l'invio (mostra "scelta inviata")
  const paused = reachedStopAt !== null;
  const pendingDecision = paused && isDecisionStop && isHumanSide ? stop + 1 : null;
  const pendingShootoutOrder = paused && isShootoutStop && isHumanSide;
  const decisionIndex = pendingDecision === null || !result ? -1 : result.decisionTicks.indexOf(pendingDecision);

  const decisionDeadline = paused
    ? reachedStopAt + (isShootoutStop ? SHOOTOUT_ORDER_TIMEOUT_MS : DECISION_TIMEOUT_MS)
    : null;
  const deadlineSec =
    decisionDeadline !== null ? Math.max(0, Math.ceil((decisionDeadline - now) / 1000)) : undefined;

  const pbState = useMemo(
    () => (result ? getPlaybackState(result, tick) : null),
    [result, tick]
  );

  const chooseTactic = (tactic: Tactic) => {
    if (pendingDecision === null || choiceSent) return;
    room.sendIntent({ type: 'TACTIC', matchId, stopTick: stop, tactic });
    setSentFor(stop);
  };
  const confirmShootoutOrder = (order: string[]) => {
    if (!pendingShootoutOrder || choiceSent) return;
    room.sendIntent({ type: 'SHOOTOUT_ORDER', matchId, order });
    setSentFor(stop);
  };

  return {
    result: result!,
    state: pbState!,
    tick,
    playing: true,
    speed: MATCH_SPEED,
    skipped: false,
    pendingDecision,
    decisionIndex,
    pendingShootoutOrder,
    currentTactic: result?.ticks[Math.max(tick, 1)]?.tactic[displaySide] ?? 'equilibrata',
    tickMs: TICK_MS / MATCH_SPEED,
    setPlaying: noop,
    setSpeed: noop,
    chooseTactic,
    confirmShootoutOrder,
    skipToEnd: noop,
    jumpToShootout: noop,
    decisionDeadline,
    deadlineSec,
    choiceSent,
  };
}
