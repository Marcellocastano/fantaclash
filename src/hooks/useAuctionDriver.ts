import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AuctionAction,
  AuctionWorld,
  getCurrentCallerId,
  buildMarketSnapshot,
  chooseBotResponder,
  chooseBotCall,
  planBotBidDelay,
  planBotCallDelay,
  lotClockStep,
  isBotControlled,
} from '../services/auction';
import type { ValuationContext } from '../services/auction';
import { TickFn, intervalTick } from '../multiplayer/clock/tick';

/**
 * Driver dell'asta: fa avanzare il mondo nel tempo quando serve.
 * Contiene i tre effetti temporali: countdown/chiusura del lotto,
 * rilanci dei bot e chiamata dei bot. Non conosce la UI né il GameContext:
 * riceve il mondo e una funzione di dispatch, così può essere montato
 * su un'asta locale o (in futuro) su una riprodotta dalla rete.
 *
 * Nessun setTimeout: rilanci e chiamate sono pianificati in ref "pending"
 * con l'istante di esecuzione; un ticker a TIMER_TICK_MS decide quando
 * eseguirli rivalutando sempre lo stato fresco da worldRef.
 * `tick` è iniettabile per poter usare un timer diverso (es. Web Worker).
 */

/** Intervallo del ticker in ms */
const TIMER_TICK_MS = 100;

/** Rilancio bot pianificato per il lotto corrente */
interface PendingBid {
  teamId: string;
  amount: number;
  /** Istante (ms epoch) a cui il rilancio avviene, <= deadline */
  at: number;
  /** Chiave del lotto: `${playerId}:${seed}` */
  lotKey: string;
}

/** Chiamata bot pianificata durante la fase 'calling' */
interface PendingCall {
  teamId: string;
  /** Istante (ms epoch) a cui la chiamata avviene */
  at: number;
}

/** Sorgente di tick periodico (default: setInterval; iniettabile) */
export type { TickFn };

const defaultTick = intervalTick;

export interface UseAuctionDriverOptions {
  world: AuctionWorld | null;
  /** Dispaccia un'azione già verificata sul mondo corrente; true se accettata */
  dispatchAction: (a: AuctionAction) => boolean;
  /** Se false il driver non fa nulla (es. spettatore o non-host) */
  enabled: boolean;
  tick?: TickFn;
  /** Tolleranza extra (ms) sulla chiusura del lotto, per latenza di rete (default 0) */
  closeGraceMs?: number;
  /** Avanzamento automatico da 'sold' e 'role_complete' (multiplayer host) */
  autoAdvance?: { soldMs: number; roleMs: number };
  /** Timeout del turno di chiamata umano: allo scadere chiama il driver (botConfig 'equilibrato') */
  humanCallTimeoutMs?: number;
  /** Notifica la scadenza del turno di chiamata umano (null quando finisce) */
  onHumanCallTurn?: (deadline: number | null) => void;
}

export interface AuctionDriver {
  /** Orologio aggiornato dal ticker (per il countdown della vista) */
  now: number;
  /** Annulla il rilancio bot pianificato (usato da rilancio utente e simulazioni) */
  cancelPendingBid: () => void;
}

function randomUint32(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

export function useAuctionDriver({
  world,
  dispatchAction,
  enabled,
  tick = defaultTick,
  closeGraceMs = 0,
  autoAdvance,
  humanCallTimeoutMs,
  onHumanCallTurn,
}: UseAuctionDriverOptions): AuctionDriver {
  // Ref sempre aggiornato con il mondo corrente (letto dal ticker, niente closure stale)
  const worldRef = useRef<AuctionWorld | null>(null);
  worldRef.current = world;

  const pendingBidRef = useRef<PendingBid | null>(null);
  const pendingCallRef = useRef<PendingCall | null>(null);
  // Ultima deadline comunicata via onHumanCallTurn (null = turno non umano)
  const humanDeadlineRef = useRef<number | null>(null);

  const [now, setNow] = useState(() => Date.now());

  const phase = world?.auction.phase ?? 'idle';
  const lot = world?.auction.lot ?? null;
  const callerId = world?.auction ? getCurrentCallerId(world.auction) : null;
  const caller = callerId ? world?.teams.find(t => t.id === callerId) : undefined;
  const callerIsBot = !!caller && isBotControlled(caller);

  // Istante d'inizio della fase/turno corrente (per autoAdvance e timeout umano).
  // Aggiornato in render come worldRef: chiave = fase + chiamante.
  const turnKey = `${phase}:${callerId ?? ''}`;
  const turnSinceRef = useRef({ key: turnKey, at: Date.now() });
  if (turnSinceRef.current.key !== turnKey) turnSinceRef.current = { key: turnKey, at: Date.now() };

  // ------------------------------------------------------------------
  // Ticker unico: clock, rilancio pendente, chiusura lotto, chiamata pendente
  // ------------------------------------------------------------------
  const tickerActive =
    enabled &&
    ((phase === 'bidding' && !!lot) ||
      (phase === 'calling' && (callerIsBot || humanCallTimeoutMs != null)) ||
      (!!autoAdvance && (phase === 'sold' || phase === 'role_complete')));

  useEffect(() => {
    if (!tickerActive) return;

    setNow(Date.now());
    return tick(() => {
      const now = Date.now();
      setNow(now);
      const fresh = worldRef.current;
      if (!fresh) return;
      const liveAuction = fresh.auction;

      if (liveAuction.phase === 'bidding' && liveAuction.lot) {
        const liveLot = liveAuction.lot;
        const pending =
          pendingBidRef.current &&
          pendingBidRef.current.lotKey === `${liveLot.player.id}:${liveLot.seed}`
            ? pendingBidRef.current
            : null;
        if (pendingBidRef.current && !pending) pendingBidRef.current = null;

        const step = lotClockStep({
          now,
          deadline: liveLot.deadline + closeGraceMs,
          pendingAt: pending?.at ?? null,
        });

        if (step === 'bid' && pending) {
          pendingBidRef.current = null;
          dispatchAction({
            type: 'BID',
            teamId: pending.teamId,
            amount: pending.amount,
            now: pending.at,
          });
        } else if (step === 'close') {
          dispatchAction({ type: 'CLOSE_LOT', now });
        }
      }

      // Avanzamento automatico dopo l'aggiudicazione / a reparto chiuso
      if (autoAdvance && liveAuction.phase === 'sold' && now >= turnSinceRef.current.at + autoAdvance.soldMs) {
        dispatchAction({ type: 'ADVANCE' });
      }
      if (autoAdvance && liveAuction.phase === 'role_complete' && now >= turnSinceRef.current.at + autoAdvance.roleMs) {
        dispatchAction({ type: 'CONTINUE' });
      }

      if (liveAuction.phase === 'calling') {
        const pendingCall = pendingCallRef.current;
        if (!pendingCall || now < pendingCall.at) return;
        pendingCallRef.current = null;
        // Rivaluta sullo stato fresco, come faceva il setTimeout originale
        const freshCaller = fresh.teams.find(t => t.id === pendingCall.teamId);
        if (!freshCaller || !liveAuction.currentRole) return;
        const ctx = {
          teams: fresh.teams,
          market: buildMarketSnapshot(fresh.teams, liveAuction.remainingPlayers),
          pool: liveAuction.remainingPlayers,
        };
        const decision = chooseBotCall(freshCaller, liveAuction.currentRole, ctx, Math.random);
        if (!decision) return;
        dispatchAction({
          type: 'CALL_PLAYER',
          teamId: pendingCall.teamId,
          playerId: decision.player.id,
          now,
          seed: randomUint32(),
        });
      }
    }, TIMER_TICK_MS);
  }, [tickerActive, dispatchAction, tick, closeGraceMs, autoAdvance]);

  // ------------------------------------------------------------------
  // Pianificazione del rilancio dei bot durante il lotto
  // ------------------------------------------------------------------
  const currentBid = lot?.currentBid ?? 0;
  const currentBidderId = lot?.currentBidderId ?? null;
  useEffect(() => {
    const w = worldRef.current;
    if (!enabled || !w || w.auction.phase !== 'bidding' || !w.auction.lot) {
      pendingBidRef.current = null;
      return;
    }
    const currentLot = w.auction.lot;
    const lotKey = `${currentLot.player.id}:${currentLot.seed}`;

    const bots = w.teams.filter(isBotControlled);
    const ctx: ValuationContext = {
      teams: w.teams,
      market: buildMarketSnapshot(w.teams, w.auction.remainingPlayers),
    };
    const responder = chooseBotResponder(bots, currentLot, ctx, Math.random);
    if (!responder) {
      pendingBidRef.current = null;
      return;
    }

    const responderTeam = w.teams.find(t => t.id === responder.teamId);
    const archetype = responderTeam?.botConfig?.archetype ?? 'equilibrato';
    const pressure = responder.limit > 0 ? currentLot.currentBid / responder.limit : 0;
    const timeLeft = currentLot.deadline - Date.now();
    const { delay } = planBotBidDelay({
      pressure,
      archetype,
      timeLeft,
      rng: Math.random,
    });

    pendingBidRef.current = {
      teamId: responder.teamId,
      amount: responder.amount,
      at: Math.min(Date.now() + delay, currentLot.deadline),
      lotKey,
    };
  }, [enabled, phase, currentBid, currentBidderId]);

  // ------------------------------------------------------------------
  // Pianificazione della chiamata del bot quando è il suo turno
  // ------------------------------------------------------------------
  useEffect(() => {
    const w = worldRef.current;
    if (
      !enabled ||
      !w ||
      w.auction.phase !== 'calling' ||
      !caller ||
      !callerIsBot ||
      !w.auction.currentRole
    ) {
      pendingCallRef.current = null;
      return;
    }
    const delay = planBotCallDelay(caller.botConfig?.archetype ?? 'equilibrato', Math.random);
    pendingCallRef.current = { teamId: caller.id, at: Date.now() + delay };
  }, [enabled, phase, callerId, caller, callerIsBot]);

  // ------------------------------------------------------------------
  // Turno di chiamata di un umano: deadline notificata + chiamata
  // automatica allo scadere (stessa logica del bot, botConfig della squadra)
  // ------------------------------------------------------------------
  useEffect(() => {
    const isHumanTurn =
      enabled && phase === 'calling' && !!caller && !callerIsBot && humanCallTimeoutMs != null;
    if (!isHumanTurn) {
      if (humanDeadlineRef.current !== null) {
        humanDeadlineRef.current = null;
        onHumanCallTurn?.(null);
      }
      return;
    }
    const deadline = turnSinceRef.current.at + humanCallTimeoutMs;
    pendingCallRef.current = { teamId: caller.id, at: deadline };
    if (humanDeadlineRef.current !== deadline) {
      humanDeadlineRef.current = deadline;
      onHumanCallTurn?.(deadline);
    }
  }, [enabled, phase, callerId, caller, callerIsBot, humanCallTimeoutMs, onHumanCallTurn]);

  const cancelPendingBid = useCallback(() => {
    pendingBidRef.current = null;
  }, []);

  return { now, cancelPendingBid };
}
