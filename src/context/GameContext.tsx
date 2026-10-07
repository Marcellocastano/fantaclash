import { 
  createContext, 
  useContext, 
  useReducer, 
  useEffect, 
  useCallback,
  ReactNode 
} from 'react';
import { 
  GameState, 
  GameConfig, 
  GamePhase, 
  Team, 
  AuctionState,
  Player 
} from '../types';
import { generateAllTeams } from '../services/teamGenerator';
import { saveGameState, loadGameState, clearGameState } from '../services/storage';
import { loadSeasonPlayers } from '../services/seasons';
import {
  AuctionAction,
  AuctionWorld,
  auctionReducer,
  buildAuctionPool,
  createInitialAuctionState,
} from '../services/auction';
import {
  TournamentAction,
  createTournament,
  tournamentReducer,
} from '../domain/tournament';

/**
 * Stato iniziale del gioco
 */
const initialState: GameState = {
  phase: 'SETUP',
  config: null,
  teams: [],
  auction: null,
  tournament: null,
};

/**
 * Tipi di azioni disponibili per il reducer
 */
type GameAction =
  | { type: 'LOAD_STATE'; payload: GameState }
  | { type: 'START_GAME'; payload: { config: GameConfig; players: Player[] } }
  | { type: 'SET_PHASE'; payload: GamePhase }
  | { type: 'UPDATE_TEAMS'; payload: Team[] }
  | { type: 'UPDATE_TEAM'; payload: Team }
  | { type: 'SET_AUCTION_STATE'; payload: AuctionState }
  | { type: 'AUCTION_ACTION'; payload: AuctionAction }
  | { type: 'SET_AUCTION_WORLD'; payload: AuctionWorld }
  | { type: 'START_TOURNAMENT'; payload: { seed: number } }
  | { type: 'TOURNAMENT_ACTION'; payload: TournamentAction }
  | { type: 'SET_TOURNAMENT'; payload: GameState['tournament'] }
  | { type: 'RESET_GAME' };

/**
 * Reducer principale per la gestione dello stato del gioco
 */
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;

    case 'START_GAME': {
      const { config, players } = action.payload;
      const pool = buildAuctionPool(players);
      const teams = generateAllTeams(config.userTeamName, config.difficulty, pool);

      // Prepara lo stato iniziale dell'asta
      const auctionState: AuctionState = createInitialAuctionState(pool);

      return {
        ...state,
        phase: 'ASTA',
        config,
        teams,
        auction: auctionState,
        tournament: null,
      };
    }

    case 'SET_PHASE':
      return { ...state, phase: action.payload };

    case 'UPDATE_TEAMS':
      return { ...state, teams: action.payload };

    case 'UPDATE_TEAM': {
      const updatedTeams = state.teams.map(team =>
        team.id === action.payload.id ? action.payload : team
      );
      return { ...state, teams: updatedTeams };
    }

    case 'SET_AUCTION_STATE':
      return { ...state, auction: action.payload };

    case 'AUCTION_ACTION': {
      if (!state.auction) return state;
      const world: AuctionWorld = { teams: state.teams, auction: state.auction };
      const next = auctionReducer(world, action.payload);
      if (next === world) return state;
      return { ...state, teams: next.teams, auction: next.auction };
    }

    case 'SET_AUCTION_WORLD':
      return { ...state, teams: action.payload.teams, auction: action.payload.auction };

    case 'START_TOURNAMENT':
      // Il torneo nasce una volta sola: chiamate ripetute riprendono quello esistente
      return {
        ...state,
        phase: 'TORNEO',
        tournament:
          state.tournament ??
          createTournament({
            teams: state.teams,
            seasonId: state.config?.season ?? '',
            seed: action.payload.seed,
          }),
      };

    case 'TOURNAMENT_ACTION': {
      if (!state.tournament) return state;
      const next = tournamentReducer(state.tournament, action.payload);
      return next === state.tournament ? state : { ...state, tournament: next };
    }

    case 'SET_TOURNAMENT':
      return { ...state, tournament: action.payload };

    case 'RESET_GAME':
      clearGameState();
      return initialState;

    default:
      return state;
  }
}

/**
 * Interfaccia del contesto del gioco
 */
interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  
  // Helper functions
  startGame: (config: GameConfig) => Promise<void>;
  resetGame: () => void;
  getUserTeam: () => Team | undefined;
  getBotTeams: () => Team[];
  getTeamById: (id: string) => Team | undefined;
}

/**
 * Context per lo stato del gioco
 */
const GameContext = createContext<GameContextValue | null>(null);

/**
 * Props del provider
 */
interface GameProviderProps {
  children: ReactNode;
}

/**
 * Provider del contesto del gioco
 * Gestisce lo stato globale e la persistenza su localStorage
 */
export function GameProvider({ children }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Carica lo stato salvato all'avvio
  useEffect(() => {
    const savedState = loadGameState();
    if (savedState) {
      dispatch({ type: 'LOAD_STATE', payload: savedState });
    }
  }, []);

  // Salva lo stato su localStorage ad ogni cambiamento
  useEffect(() => {
    // Non salvare lo stato iniziale vuoto
    if (state.phase !== 'SETUP' || state.config !== null) {
      saveGameState(state);
    }
  }, [state]);

  /**
   * Avvia una nuova partita con la configurazione specificata
   */
  const startGame = useCallback(async (config: GameConfig) => {
    const players = await loadSeasonPlayers(config.season);
    dispatch({ type: 'START_GAME', payload: { config, players } });
  }, []);

  /**
   * Resetta il gioco e torna alla schermata di setup
   */
  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, []);

  /**
   * Ottiene la squadra dell'utente
   */
  const getUserTeam = useCallback(() => {
    return state.teams.find(team => team.isUserTeam);
  }, [state.teams]);

  /**
   * Ottiene tutte le squadre bot
   */
  const getBotTeams = useCallback(() => {
    return state.teams.filter(team => !team.isUserTeam);
  }, [state.teams]);

  /**
   * Ottiene una squadra per ID
   */
  const getTeamById = useCallback((id: string) => {
    return state.teams.find(team => team.id === id);
  }, [state.teams]);

  const value: GameContextValue = {
    state,
    dispatch,
    startGame,
    resetGame,
    getUserTeam,
    getBotTeams,
    getTeamById,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

/**
 * Hook per accedere al contesto del gioco
 * @throws Error se usato fuori dal GameProvider
 */
export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame deve essere usato all\'interno di un GameProvider');
  }
  return context;
}

/**
 * Hook per accedere solo allo stato (ottimizzazione per componenti read-only)
 */
export function useGameState(): GameState {
  const { state } = useGame();
  return state;
}

/**
 * Hook per accedere alla configurazione del gioco
 */
export function useGameConfig(): GameConfig | null {
  const { state } = useGame();
  return state.config;
}

/**
 * Hook per accedere alla fase corrente del gioco
 */
export function useGamePhase(): GamePhase {
  const { state } = useGame();
  return state.phase;
}
