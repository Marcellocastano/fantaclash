import { GamePhase, GameState } from '../types';

/**
 * Chiave utilizzata per salvare lo stato del gioco in localStorage
 */
const STORAGE_KEY = 'fanta-fc-game-state';

/**
 * Versione dello schema di salvataggio
 * Incrementare quando si modifica la struttura di GameState
 */
const STORAGE_VERSION = 6;

/**
 * Struttura del dato salvato in localStorage
 */
interface StoredData {
  version: number;
  timestamp: number;
  state: GameState;
}

/**
 * Salva lo stato del gioco in localStorage
 * @param state Lo stato del gioco da salvare
 */
export function saveGameState(state: GameState): void {
  try {
    const data: StoredData = {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      state,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Errore nel salvataggio dello stato:', error);
  }
}

/**
 * Carica lo stato del gioco da localStorage
 * @returns Lo stato salvato o null se non esiste o è invalido
 */
export function loadGameState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data: StoredData = JSON.parse(raw);
    
    // Verifica la versione dello schema
    if (data.version !== STORAGE_VERSION) {
      console.warn('Versione dello stato non compatibile, reset necessario');
      clearGameState();
      return null;
    }

    const state = sanitizeGameState(data.state);
    if (!state) {
      console.warn('Stato corrotto, reset necessario');
      clearGameState();
      return null;
    }
    return state;
  } catch (error) {
    console.error('Errore nel caricamento dello stato:', error);
    clearGameState();
    return null;
  }
}

const PHASES: GamePhase[] = ['SETUP', 'ASTA', 'TORNEO', 'FINALE'];

/**
 * Valida e ripara uno stato caricato. Uno stato può essere stato salvato
 * con la versione corrente ma con una forma vecchia (es. hot reload in
 * sviluppo durante un cambio di schema): fase sconosciuta o torneo
 * mancante portano a una schermata vuota, quindi:
 * - fase sconosciuta o TORNEO/FINALE senza torneo -> torna alla fine
 *   dell'asta se completata (da lì "Vai al torneo" crea il torneo),
 *   altrimenti stato non recuperabile (null);
 * - campi mancanti -> valori di default.
 */
export function sanitizeGameState(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<GameState> & { phase?: unknown };
  if (typeof s.phase !== 'string' || !Array.isArray(s.teams)) return null;
  const state: GameState = {
    phase: s.phase as GamePhase,
    config: s.config ?? null,
    teams: s.teams,
    auction: s.auction ?? null,
    tournament: s.tournament ?? null,
  };
  const needsTournament = state.phase === 'TORNEO' || state.phase === 'FINALE';
  if (!PHASES.includes(state.phase) || (needsTournament && !state.tournament)) {
    if (state.auction?.phase === 'complete' && state.config) return { ...state, phase: 'ASTA', tournament: null };
    return null;
  }
  if (state.phase !== 'SETUP' && !state.config) return null;
  return state;
}

/**
 * Cancella lo stato del gioco da localStorage
 */
export function clearGameState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Errore nella cancellazione dello stato:', error);
  }
}

/**
 * Verifica se esiste uno stato salvato
 */
export function hasStoredGameState(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Ottiene informazioni sul salvataggio corrente
 */
export function getStorageInfo(): { exists: boolean; timestamp: number | null; phase: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { exists: false, timestamp: null, phase: null };

    const data: StoredData = JSON.parse(raw);
    return {
      exists: true,
      timestamp: data.timestamp,
      phase: data.state?.phase || null,
    };
  } catch {
    return { exists: false, timestamp: null, phase: null };
  }
}
