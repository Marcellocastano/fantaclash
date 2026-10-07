import { Player } from '../types';

/**
 * Voce dell'indice delle stagioni storiche disponibili in /data/seasons.
 */
export interface SeasonInfo {
  season: string;
  label: string;
  playerCount: number;
}

const VALID_ROLES = new Set(['P', 'D', 'C', 'A']);

function isPlayerShape(p: unknown): p is Player {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.role === 'string' &&
    VALID_ROLES.has(o.role) &&
    typeof o.team === 'string' &&
    typeof o.baseValue === 'number' &&
    typeof o.avgRating === 'number'
  );
}

/**
 * Carica l'indice delle stagioni disponibili.
 * @throws Error con messaggio in italiano se il file manca o è malformato
 */
export async function loadSeasonIndex(): Promise<SeasonInfo[]> {
  const res = await fetch('/data/seasons/index.json');
  if (!res.ok) {
    throw new Error(`Impossibile caricare l'elenco delle stagioni (HTTP ${res.status})`);
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('Elenco delle stagioni malformato');
  }
  return data.filter(
    (e): e is SeasonInfo =>
      typeof e === 'object' &&
      e !== null &&
      typeof (e as SeasonInfo).season === 'string' &&
      typeof (e as SeasonInfo).label === 'string' &&
      typeof (e as SeasonInfo).playerCount === 'number'
  );
}

/**
 * Carica i giocatori di una stagione storica.
 * @throws Error con messaggio in italiano se il file manca o è malformato
 */
export async function loadSeasonPlayers(season: string): Promise<Player[]> {
  const res = await fetch(`/data/seasons/${season}.json`);
  if (!res.ok) {
    throw new Error(`Impossibile caricare la stagione ${season} (HTTP ${res.status})`);
  }
  const data: unknown = await res.json();
  if (typeof data !== 'object' || data === null || !Array.isArray((data as { players?: unknown }).players)) {
    throw new Error(`Dati della stagione ${season} malformati`);
  }
  const players = (data as { players: unknown[] }).players;
  if (!players.every(isPlayerShape)) {
    throw new Error(`Giocatori della stagione ${season} malformati`);
  }
  return players;
}
