import { useState, useCallback, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Player, PlayerRole } from '../types';
import {
  AuctionAction,
  AuctionWorld,
  auctionReducer,
  getCurrentCallerId,
  getMaxBid,
  needsRole,
  buildMarketSnapshot,
  chooseBotResponder,
  chooseBotCall,
  planBotBidDelay,
  planBotCallDelay,
  lotClockStep,
  runAuction,
  shuffle,
} from '../services/auction';
import type { RunOptions, ValuationContext } from '../services/auction';

/**
 * ============================================================================
 * HOOK D'ASTA — adattatore sottile sopra il motore puro in services/auction
 * ============================================================================
 *
 * Regole:
 * 1. L'asta procede per reparti: P -> D -> C -> A
 * 2. Ogni squadra a turno CHIAMA un giocatore
 * 3. L'asta parte da 1 credito (offerto dal chiamante)
 * 4. Timer di 5 secondi - chiunque può rilanciare in qualsiasi momento
 * 5. Ogni rilancio resetta il timer a 5 secondi
 * 6. Quando il timer scade, il giocatore va al miglior offerente
 *
 * Tutta la logica è nel reducer puro: questo hook traduce solo lo stato
 * del gioco in props per la UI e dispaccia le azioni.
 *
 * Tempi dei bot: i rilanci sono pianificati in un ref "pending" con l'istante
 * logico di esecuzione; un ticker a 100 ms (lotClockStep) decide quando
 * eseguire il rilancio o chiudere il lotto — niente setTimeout per i rilanci.
 */

/** Stati dell'asta esposti alla UI */
export type AuctionRoundState =
  | 'idle'              // In attesa di avviare
  | 'calling'           // Turno di chiamata utente
  | 'bot_calling'       // Un bot sta scegliendo il giocatore
  | 'auction_active'    // Asta in corso con timer
  | 'sold'              // Giocatore venduto
  | 'role_complete'     // Reparto completato
  | 'auction_complete'; // Asta terminata

/** Intervallo del ticker del lotto in ms */
const TIMER_TICK_MS = 100;

/**
 * Rilancio pendente di un bot, eseguito dal ticker del lotto
 */
interface PendingBid {
  teamId: string;
  amount: number;
  /** Istante logico (ms epoch) a cui il rilancio avviene, <= deadline */
  at: number;
  /** Chiave del lotto: `${playerId}:${seed}` */
  lotKey: string;
}

function randomUint32(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

/**
 * Hook per gestire la logica dell'asta a tempo
 */
export function useAuction() {
  const { state, dispatch } = useGame();

  const auction = state.auction;
  const teams = state.teams;
  const lot = auction?.lot ?? null;

  // Ref sempre aggiornato con il mondo corrente (letto dal ticker, niente closure stale)
  const worldRef = useRef<AuctionWorld | null>(null);
  worldRef.current = auction ? { teams, auction } : null;

  // Rilancio bot pianificato per il lotto corrente
  const pendingBidRef = useRef<PendingBid | null>(null);

  const [timeRemaining, setTimeRemaining] = useState(0);

  const userTeam = teams.find(t => t.isUserTeam);

  /**
   * Dispaccia un'azione d'asta verificando prima che sia accettata
   * (il reducer restituisce la stessa referenza se invalida)
   */
  const dispatchAuctionAction = useCallback((action: AuctionAction): boolean => {
    const world = worldRef.current;
    if (!world) return false;
    const next = auctionReducer(world, action);
    if (next === world) return false;
    dispatch({ type: 'AUCTION_ACTION', payload: action });
    return true;
  }, [dispatch]);

  // ------------------------------------------------------------------
  // Effetto: countdown del lotto + clock dei rilanci pendenti
  // ------------------------------------------------------------------
  useEffect(() => {
    if (auction?.phase !== 'bidding' || !lot) return;

    setTimeRemaining(Math.max(0, lot.deadline - Date.now()));

    const interval = setInterval(() => {
      const now = Date.now();
      const liveLot = worldRef.current?.auction.lot;
      const pending =
        pendingBidRef.current &&
        liveLot &&
        pendingBidRef.current.lotKey === `${liveLot.player.id}:${liveLot.seed}`
          ? pendingBidRef.current
          : null;
      if (pendingBidRef.current && !pending) pendingBidRef.current = null;

      const step = lotClockStep({
        now,
        deadline: lot.deadline,
        pendingAt: pending?.at ?? null,
      });

      if (step === 'bid' && pending) {
        pendingBidRef.current = null;
        dispatchAuctionAction({
          type: 'BID',
          teamId: pending.teamId,
          amount: pending.amount,
          now: pending.at,
        });
      } else if (step === 'close') {
        dispatchAuctionAction({ type: 'CLOSE_LOT', now });
      }

      setTimeRemaining(Math.max(0, lot.deadline - now));
    }, TIMER_TICK_MS);

    return () => clearInterval(interval);
  }, [auction?.phase, lot, dispatchAuctionAction]);

  // ------------------------------------------------------------------
  // Effetto: pianificazione del rilancio dei bot durante il lotto
  // ------------------------------------------------------------------
  const currentBid = lot?.currentBid ?? 0;
  const currentBidderId = lot?.currentBidderId ?? null;
  useEffect(() => {
    const world = worldRef.current;
    if (!world || world.auction.phase !== 'bidding' || !world.auction.lot) {
      pendingBidRef.current = null;
      return;
    }
    const currentLot = world.auction.lot;
    const lotKey = `${currentLot.player.id}:${currentLot.seed}`;

    const bots = world.teams.filter(t => !t.isUserTeam);
    const ctx: ValuationContext = {
      teams: world.teams,
      market: buildMarketSnapshot(world.teams, world.auction.remainingPlayers),
    };
    const responder = chooseBotResponder(bots, currentLot, ctx, Math.random);
    if (!responder) {
      pendingBidRef.current = null;
      return;
    }

    const responderTeam = world.teams.find(t => t.id === responder.teamId);
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
  }, [auction?.phase, currentBid, currentBidderId]);

  // ------------------------------------------------------------------
  // Effetto: chiamata del bot quando è il suo turno
  // ------------------------------------------------------------------
  const callerId = auction ? getCurrentCallerId(auction) : null;
  useEffect(() => {
    const world = worldRef.current;
    if (!world || world.auction.phase !== 'calling') return;
    const caller = callerId ? world.teams.find(t => t.id === callerId) : undefined;
    if (!caller || caller.isUserTeam || !world.auction.currentRole) return;

    const role = world.auction.currentRole;
    const delay = planBotCallDelay(
      caller.botConfig?.archetype ?? 'equilibrato',
      Math.random
    );

    const timeout = setTimeout(() => {
      const fresh = worldRef.current;
      if (!fresh || fresh.auction.phase !== 'calling') return;
      const freshCaller = fresh.teams.find(t => t.id === caller.id);
      if (!freshCaller) return;

      const ctx = {
        teams: fresh.teams,
        market: buildMarketSnapshot(fresh.teams, fresh.auction.remainingPlayers),
        pool: fresh.auction.remainingPlayers,
      };
      const decision = chooseBotCall(freshCaller, role, ctx, Math.random);
      if (!decision) return;
      dispatchAuctionAction({
        type: 'CALL_PLAYER',
        teamId: caller.id,
        playerId: decision.player.id,
        now: Date.now(),
        seed: randomUint32(),
      });
    }, delay);

    return () => clearTimeout(timeout);
  }, [auction?.phase, callerId, dispatchAuctionAction]);

  // ------------------------------------------------------------------
  // Azioni esposte alla UI
  // ------------------------------------------------------------------

  /** Avvia l'asta: l'utente chiama per primo, i bot in ordine casuale */
  const startAuction = useCallback(() => {
    const world = worldRef.current;
    const user = world?.teams.find(t => t.isUserTeam);
    if (!world || !user) return;
    const botIds = shuffle(
      world.teams.filter(t => !t.isUserTeam).map(t => t.id),
      Math.random
    );
    dispatchAuctionAction({ type: 'START', callingOrder: [user.id, ...botIds] });
  }, [dispatchAuctionAction]);

  /** L'utente chiama un giocatore */
  const userCallPlayer = useCallback((player: Player): boolean => {
    const world = worldRef.current;
    const user = world?.teams.find(t => t.isUserTeam);
    if (!world || !user) return false;
    return dispatchAuctionAction({
      type: 'CALL_PLAYER',
      teamId: user.id,
      playerId: player.id,
      now: Date.now(),
      seed: randomUint32(),
    });
  }, [dispatchAuctionAction]);

  /** L'utente rilancia sul lotto corrente (annulla il rilancio bot pianificato) */
  const userBid = useCallback((amount: number): boolean => {
    const world = worldRef.current;
    const user = world?.teams.find(t => t.isUserTeam);
    if (!world || !user) return false;
    pendingBidRef.current = null;
    return dispatchAuctionAction({ type: 'BID', teamId: user.id, amount, now: Date.now() });
  }, [dispatchAuctionAction]);

  /** Conferma l'assegnazione e passa al prossimo turno */
  const confirmAssignment = useCallback(() => {
    dispatchAuctionAction({ type: 'ADVANCE' });
  }, [dispatchAuctionAction]);

  /** Continua al reparto successivo dopo 'role_complete' */
  const continueToNextRole = useCallback(() => {
    dispatchAuctionAction({ type: 'CONTINUE' });
  }, [dispatchAuctionAction]);

  /** Esegue il simulatore sul mondo corrente e salva il risultato */
  const runSimulation = useCallback((
    until: RunOptions['until'],
    userAutopilot = false,
    from: AuctionWorld | null = worldRef.current
  ) => {
    if (!from) return;
    pendingBidRef.current = null;
    const result = runAuction(from, {
      rng: Math.random,
      until,
      startTime: Date.now(),
      userAutopilot,
    });
    if (result !== worldRef.current) {
      dispatch({ type: 'SET_AUCTION_WORLD', payload: result });
    }
  }, [dispatch]);

  /**
   * Simula il lotto corrente senza rilanci dell'utente: i bot proseguono
   * l'asta e il giocatore va al prezzo a cui si sarebbe arrivati
   */
  const simulateLot = useCallback(() => runSimulation('lot_end'), [runSimulation]);

  /** Simula la fine del reparto corrente (incluso l'eventuale lotto aperto) */
  const simulateRoleCompletion = useCallback(() => runSimulation('role_end'), [runSimulation]);

  /** Simula l'intera asta, squadra utente inclusa (autopilota) */
  const simulateAll = useCallback(() => {
    const world = worldRef.current;
    const user = world?.teams.find(t => t.isUserTeam);
    if (!world || !user) return;
    // Da 'idle' avvia prima l'asta con lo stesso ordine di startAuction
    const from = world.auction.phase === 'idle'
      ? auctionReducer(world, {
          type: 'START',
          callingOrder: [
            user.id,
            ...shuffle(world.teams.filter(t => !t.isUserTeam).map(t => t.id), Math.random),
          ],
        })
      : world;
    runSimulation('auction_end', true, from);
  }, [runSimulation]);

  // ------------------------------------------------------------------
  // Stato derivato per la UI
  // ------------------------------------------------------------------

  const caller = callerId ? teams.find(t => t.id === callerId) : undefined;
  const isUserCallingTurn = !!caller?.isUserTeam;

  const phase = auction?.phase ?? 'idle';
  const roundState: AuctionRoundState =
    phase === 'calling'
      ? isUserCallingTurn ? 'calling' : 'bot_calling'
      : phase === 'bidding'
        ? 'auction_active'
        : phase === 'complete'
          ? 'auction_complete'
          : phase;

  const currentRole: PlayerRole = auction?.currentRole ?? 'P';

  const availablePlayers: Player[] = auction
    ? auction.remainingPlayers
        .filter(p => p.role === currentRole)
        .sort((a, b) => b.baseValue - a.baseValue)
    : [];

  const canUserBid =
    !!userTeam && !!lot && phase === 'bidding' && needsRole(userTeam, lot.player.role);

  const userMaxBid = userTeam ? getMaxBid(userTeam) : 0;

  const hasUserCompletedCurrentRole =
    !!userTeam && !!auction?.currentRole && !needsRole(userTeam, auction.currentRole);

  // Il lotto è simulabile se è aperto o se un bot deve ancora chiamare
  const canSimulateLot = phase === 'bidding' || (phase === 'calling' && !isUserCallingTurn);
  // Il reparto è simulabile solo se l'utente lo ha completato
  const canSimulateRole =
    hasUserCompletedCurrentRole && (phase === 'calling' || phase === 'bidding' || phase === 'sold');

  return {
    // Stato
    roundState,
    currentRole,
    currentPlayer: lot?.player ?? null,
    currentBid,
    currentBidderId,
    bidHistory: lot?.bidHistory ?? [],
    timeRemaining,
    callerId,

    // Computed
    isUserCallingTurn,
    availablePlayers,
    remainingPlayersCount: auction?.remainingPlayers.length ?? 0,
    isComplete: phase === 'complete',
    canUserBid,
    userMaxBid,
    hasUserCompletedCurrentRole,
    canSimulateLot,
    canSimulateRole,

    // Actions
    startAuction,
    userCallPlayer,
    userBid,
    confirmAssignment,
    continueToNextRole,
    simulateLot,
    simulateRoleCompletion,
    simulateAll,
  };
}
