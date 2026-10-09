import { createContext, useCallback, useContext, ReactNode } from 'react';
import { useGame } from '../context/GameContext';
import { Team } from '../types';
import {
  simulateRemaining,
  TournamentAction,
  TournamentState,
} from '../domain/tournament';

/**
 * Controller del torneo: i dati e le azioni che le schermate del torneo
 * usano. Come per l'asta, la UI dipende solo da questa interfaccia.
 */
export interface TournamentController {
  tournament: TournamentState | null;
  teams: Team[];
  myTeamId: string | null;
  /** Azione del reducer del torneo */
  dispatchTournament: (action: TournamentAction) => void;
  /** Sostituisce lo stato del torneo */
  setTournament: (next: TournamentState) => void;
  /** Simula tutto il resto del torneo e passa alla fase FINALE */
  finishTournament: (next?: TournamentState) => void;
  resetGame: () => void;
  /** true in stanza multiplayer: lo stato cambia solo via comandi dell'host */
  inRoom: boolean;
  /** Etichetta del pulsante del riepilogo finale (default "Nuova partita") */
  finalLabel?: string;
  /** Contenuto al posto di tagline+pulsante nel riepilogo (stanza: rivincita) */
  finalSlot?: ReactNode;
}

const TournamentControllerContext = createContext<TournamentController | null>(null);

export function TournamentControllerProvider({
  value,
  children,
}: {
  value: TournamentController;
  children: ReactNode;
}) {
  return (
    <TournamentControllerContext.Provider value={value}>
      {children}
    </TournamentControllerContext.Provider>
  );
}

/** Controller locale del torneo, implementato su GameContext */
export function useLocalTournament(): TournamentController {
  const { state, dispatch, resetGame } = useGame();
  const tournament = state.tournament;
  const teams = state.teams;
  const myTeamId = state.teams.find(t => t.isUserTeam)?.id ?? null;

  const dispatchTournament = useCallback(
    (action: TournamentAction) => dispatch({ type: 'TOURNAMENT_ACTION', payload: action }),
    [dispatch]
  );

  const setTournament = useCallback(
    (next: TournamentState) => dispatch({ type: 'SET_TOURNAMENT', payload: next }),
    [dispatch]
  );

  const finishTournament = useCallback(
    (next: TournamentState | undefined) => {
      const current = next ?? tournament;
      if (!current) return;
      setTournament(simulateRemaining(current, teams));
      dispatch({ type: 'SET_PHASE', payload: 'FINALE' });
    },
    [dispatch, setTournament, tournament, teams]
  );

  return {
    tournament,
    teams,
    myTeamId,
    dispatchTournament,
    setTournament,
    finishTournament,
    resetGame,
    inRoom: false,
  };
}

/** Provider che monta il controller locale del torneo */
export function LocalTournamentProvider({ children }: { children: ReactNode }) {
  const controller = useLocalTournament();
  return <TournamentControllerProvider value={controller}>{children}</TournamentControllerProvider>;
}

/**
 * Hook per leggere il controller del torneo
 * @throws Error se usato fuori da un TournamentControllerProvider
 */
export function useTournamentController(): TournamentController {
  const context = useContext(TournamentControllerContext);
  if (!context) {
    throw new Error('useTournamentController deve essere usato all\'interno di un TournamentControllerProvider');
  }
  return context;
}
