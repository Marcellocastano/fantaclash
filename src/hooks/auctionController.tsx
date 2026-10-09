import { createContext, useCallback, useContext, useRef, ReactNode } from 'react';
import { useGame } from '../context/GameContext';
import { Player, Team } from '../types';
import {
  AuctionAction,
  AuctionView,
  AuctionWorld,
  auctionReducer,
  deriveAuctionView,
  runAuction,
  shuffle,
} from '../services/auction';
import type { RunOptions } from '../services/auction';
import { useAuctionDriver } from './useAuctionDriver';

/**
 * Controller dell'asta: la stessa forma dell'oggetto che restituiva
 * useAuction, più i dati che la stanza leggeva da useGame (squadre,
 * annata). La UI dipende solo da questa interfaccia: nel gioco singolo
 * la sorgente è useLocalAuction, nel multiplayer sarà un controller remoto.
 */
/** Metadati della squadra in stanza (proprietario e connessione) */
export interface TeamMeta {
  nickname?: string;
  controller: 'human' | 'bot' | 'autopilot';
  connected: boolean;
}

export interface AuctionController extends AuctionView {
  teams: Team[];
  /** Annata della stagione in gioco */
  season: string | undefined;
  /** false in stanza: la UI nasconde simulazioni e avanzamenti manuali */
  allowSimulation: boolean;
  /** In stanza: chi controlla ogni squadra (assente nel gioco singolo) */
  teamMeta?: Record<string, TeamMeta>;
  /** Scadenza del turno di chiamata di un umano (clock host), null in locale */
  callDeadline: number | null;
  /** Orologio della vista (locale: Date.now; stanza: hostNow) per i countdown */
  now: number;

  // Azioni
  startAuction: () => void;
  userCallPlayer: (player: Player) => boolean;
  userBid: (amount: number) => boolean;
  confirmAssignment: () => void;
  continueToNextRole: () => void;
  simulateLot: () => void;
  simulateRoleCompletion: () => void;
  simulateAll: () => void;
}

const AuctionControllerContext = createContext<AuctionController | null>(null);

export function AuctionControllerProvider({
  value,
  children,
}: {
  value: AuctionController;
  children: ReactNode;
}) {
  return (
    <AuctionControllerContext.Provider value={value}>
      {children}
    </AuctionControllerContext.Provider>
  );
}

/**
 * Controller locale del gioco singolo: GameContext come sorgente del mondo,
 * useAuctionDriver sempre abilitato, vista derivata sulla squadra utente.
 */
export function useLocalAuction(): AuctionController {
  const { state, dispatch } = useGame();

  const world: AuctionWorld | null = state.auction
    ? { teams: state.teams, auction: state.auction }
    : null;

  // Ref sempre aggiornato con il mondo corrente (letto dalle azioni, niente closure stale)
  const worldRef = useRef<AuctionWorld | null>(null);
  worldRef.current = world;

  /**
   * Dispaccia un'azione d'asta verificando prima che sia accettata
   * (il reducer restituisce la stessa referenza se invalida)
   */
  const dispatchAuctionAction = useCallback((action: AuctionAction): boolean => {
    const w = worldRef.current;
    if (!w) return false;
    const next = auctionReducer(w, action);
    if (next === w) return false;
    dispatch({ type: 'AUCTION_ACTION', payload: action });
    return true;
  }, [dispatch]);

  const { now, cancelPendingBid } = useAuctionDriver({
    world,
    dispatchAction: dispatchAuctionAction,
    enabled: true,
  });

  const myTeam = state.teams.find(t => t.isUserTeam);
  const view = deriveAuctionView(world, myTeam?.id ?? null, now);

  // ------------------------------------------------------------------
  // Azioni esposte alla UI
  // ------------------------------------------------------------------

  /** Avvia l'asta: l'utente chiama per primo, i bot in ordine casuale */
  const startAuction = useCallback(() => {
    const w = worldRef.current;
    const user = w?.teams.find(t => t.isUserTeam);
    if (!w || !user) return;
    const botIds = shuffle(
      w.teams.filter(t => !t.isUserTeam).map(t => t.id),
      Math.random
    );
    dispatchAuctionAction({ type: 'START', callingOrder: [user.id, ...botIds] });
  }, [dispatchAuctionAction]);

  /** L'utente chiama un giocatore */
  const userCallPlayer = useCallback((player: Player): boolean => {
    const w = worldRef.current;
    const user = w?.teams.find(t => t.isUserTeam);
    if (!w || !user) return false;
    return dispatchAuctionAction({
      type: 'CALL_PLAYER',
      teamId: user.id,
      playerId: player.id,
      now: Date.now(),
      seed: Math.floor(Math.random() * 0xffffffff),
    });
  }, [dispatchAuctionAction]);

  /** L'utente rilancia sul lotto corrente (annulla il rilancio bot pianificato) */
  const userBid = useCallback((amount: number): boolean => {
    const w = worldRef.current;
    const user = w?.teams.find(t => t.isUserTeam);
    if (!w || !user) return false;
    cancelPendingBid();
    return dispatchAuctionAction({ type: 'BID', teamId: user.id, amount, now: Date.now() });
  }, [dispatchAuctionAction, cancelPendingBid]);

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
    cancelPendingBid();
    const result = runAuction(from, {
      rng: Math.random,
      until,
      startTime: Date.now(),
      userAutopilot,
    });
    if (result !== worldRef.current) {
      dispatch({ type: 'SET_AUCTION_WORLD', payload: result });
    }
  }, [dispatch, cancelPendingBid]);

  /**
   * Simula il lotto corrente senza rilanci dell'utente: i bot proseguono
   * l'asta e il giocatore va al prezzo a cui si sarebbe arrivati
   */
  const simulateLot = useCallback(() => runSimulation('lot_end'), [runSimulation]);

  /** Simula la fine del reparto corrente (incluso l'eventuale lotto aperto) */
  const simulateRoleCompletion = useCallback(() => runSimulation('role_end'), [runSimulation]);

  /** Simula l'intera asta, squadra utente inclusa (autopilota) */
  const simulateAll = useCallback(() => {
    const w = worldRef.current;
    const user = w?.teams.find(t => t.isUserTeam);
    if (!w || !user) return;
    // Da 'idle' avvia prima l'asta con lo stesso ordine di startAuction
    const from = w.auction.phase === 'idle'
      ? auctionReducer(w, {
          type: 'START',
          callingOrder: [
            user.id,
            ...shuffle(w.teams.filter(t => !t.isUserTeam).map(t => t.id), Math.random),
          ],
        })
      : w;
    runSimulation('auction_end', true, from);
  }, [runSimulation]);

  return {
    ...view,
    teams: state.teams,
    season: state.config?.season,
    allowSimulation: true,
    callDeadline: null,
    now,
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

/** Provider che monta il controller locale del gioco singolo */
export function LocalAuctionProvider({ children }: { children: ReactNode }) {
  const controller = useLocalAuction();
  return <AuctionControllerProvider value={controller}>{children}</AuctionControllerProvider>;
}

/**
 * Hook per leggere il controller dell'asta
 * @throws Error se usato fuori da un AuctionControllerProvider
 */
export function useAuctionController(): AuctionController {
  const context = useContext(AuctionControllerContext);
  if (!context) {
    throw new Error('useAuctionController deve essere usato all\'interno di un AuctionControllerProvider');
  }
  return context;
}
