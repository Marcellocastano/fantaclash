import { Player, PlayerRole, Team, ROSTER_REQUIREMENTS } from '../../types';

/**
 * Regole fondamentali dell'asta: unica fonte di verità per slot di rosa,
 * limiti di spesa, ordine dei reparti e rotazione dei chiamanti.
 */

/** Ordine dei reparti: prima i portieri, poi difensori, centrocampisti, attaccanti */
export const ROLE_ORDER: PlayerRole[] = ['P', 'D', 'C', 'A'];

/** Numero fisso di squadre della lega */
export const LEAGUE_SIZE = 8;

/** Crediti iniziali di ogni squadra */
export const INITIAL_CREDITS = 100;

/** Durata del timer del lotto in millisecondi (ogni rilancio lo resetta) */
export const LOT_DURATION_MS = 5000;

/** Offerta di apertura di ogni lotto, fatta dal chiamante */
export const OPENING_BID = 1;

/** Durata effettiva del timer del lotto: override dell'asta o default */
export function getLotDuration(auction: { lotDurationMs?: number }): number {
  return auction.lotDurationMs ?? LOT_DURATION_MS;
}

/**
 * La squadra è guidata dal driver automatico (bot o autopilota)?
 * Senza controller esplicito vale isUserTeam: nel gioco singolo i bot
 * sono tutte le squadre non utente.
 */
export function isBotControlled(team: Team): boolean {
  return team.controller ? team.controller !== 'human' : !team.isUserTeam;
}

/**
 * Cache degli slot residui per oggetto squadra: le squadre sono trattate
 * come immutabili (ogni azione crea nuovi oggetti), quindi il risultato
 * per una data referenza non cambia mai.
 */
const remainingSlotsCache = new WeakMap<Team, Record<PlayerRole, number>>();

/**
 * Slot rimanenti per ruolo nella rosa di una squadra (mai negativi).
 * Restituisce sempre una copia fresca: i chiamanti possono modificarla.
 */
export function getRemainingSlots(team: Team): Record<PlayerRole, number> {
  const cached = remainingSlotsCache.get(team);
  if (cached) return { ...cached };
  const remaining: Record<PlayerRole, number> = { P: 0, D: 0, C: 0, A: 0 };
  for (const role of ROLE_ORDER) {
    remaining[role] = ROSTER_REQUIREMENTS[role].total;
  }
  for (const owned of team.roster) {
    const role = owned.player.role;
    if (remaining[role] > 0) {
      remaining[role]--;
    }
  }
  remainingSlotsCache.set(team, remaining);
  return { ...remaining };
}

/**
 * Numero totale di giocatori ancora da acquistare
 */
export function getTotalRemainingSlots(team: Team): number {
  const remaining = getRemainingSlots(team);
  return ROLE_ORDER.reduce((sum, role) => sum + remaining[role], 0);
}

/**
 * Verifica se la squadra ha ancora bisogno del ruolo indicato
 */
export function needsRole(team: Team, role: PlayerRole): boolean {
  return getRemainingSlots(team)[role] > 0;
}

/**
 * Massimo offribile dalla squadra: deve restare almeno 1 credito
 * per ogni altro slot ancora da riempire. 0 se la rosa è completa.
 */
export function getMaxBid(team: Team): number {
  const slots = getTotalRemainingSlots(team);
  if (slots <= 0) return 0;
  return team.credits - (slots - 1);
}

/**
 * Verifica se la squadra può offrire `amount` per il giocatore
 */
export function canBid(team: Team, player: Player, amount: number): boolean {
  return needsRole(team, player.role) && amount <= getMaxBid(team);
}

/**
 * Ruolo corrente dell'asta: il primo di ROLE_ORDER tale che almeno una
 * squadra lo necessiti e il pool contenga ancora giocatori di quel ruolo.
 * Restituisce null se nessun ruolo è più giocabile (previene deadlock).
 */
export function getCurrentRole(teams: Team[], pool: Player[]): PlayerRole | null {
  for (const role of ROLE_ORDER) {
    const someTeamNeeds = teams.some(team => needsRole(team, role));
    const poolHasRole = pool.some(player => player.role === role);
    if (someTeamNeeds && poolHasRole) {
      return role;
    }
  }
  return null;
}

/**
 * Indice del prossimo chiamante dopo `fromIndex`, con wrap-around.
 * La squadra in `fromIndex` viene considerata per ultima (rotazione continua).
 * Restituisce -1 se nessuna squadra ha bisogno del ruolo.
 */
export function getNextCallerIndex(
  order: readonly (Team | undefined)[],
  fromIndex: number,
  role: PlayerRole
): number {
  const n = order.length;
  if (n === 0) return -1;
  for (let step = 1; step <= n; step++) {
    const index = (fromIndex + step) % n;
    const team = order[index];
    if (team && needsRole(team, role)) {
      return index;
    }
  }
  return -1;
}

/** Fattore del listone: per ogni ruolo vanno all'asta i migliori ceil(LISTONE_FACTOR × squadre × slot_ruolo) */
export const LISTONE_FACTOR = 1.5;

/**
 * Costruisce il "listone ridotto": per ogni ruolo solo i migliori
 * `ceil(factor × numberOfTeams × slot_ruolo)` giocatori vanno all'asta.
 * Ordinamento per ruolo: baseValue desc, a parità avgRating desc, poi nome asc.
 * `factor = Infinity` restituisce l'intero pool. Il risultato è raggruppato
 * per ruolo in ROLE_ORDER.
 */
export function buildAuctionPool(
  players: Player[],
  numberOfTeams: number = LEAGUE_SIZE,
  factor: number = LISTONE_FACTOR
): Player[] {
  const pool: Player[] = [];
  for (const role of ROLE_ORDER) {
    const sorted = players
      .filter(p => p.role === role)
      .sort(
        (a, b) =>
          b.baseValue - a.baseValue ||
          b.avgRating - a.avgRating ||
          a.name.localeCompare(b.name)
      );
    const count = Number.isFinite(factor)
      ? Math.ceil(factor * numberOfTeams * ROSTER_REQUIREMENTS[role].total)
      : sorted.length;
    pool.push(...sorted.slice(0, count));
  }
  return pool;
}

/**
 * Numero massimo di squadre supportate dal pool di giocatori:
 * il minimo sui ruoli di floor(giocatori_ruolo / slot_ruolo).
 */
export function getMaxSupportedTeams(players: Player[]): number {
  const counts: Record<PlayerRole, number> = { P: 0, D: 0, C: 0, A: 0 };
  for (const player of players) {
    counts[player.role]++;
  }
  return Math.min(
    ...ROLE_ORDER.map(role => Math.floor(counts[role] / ROSTER_REQUIREMENTS[role].total))
  );
}
