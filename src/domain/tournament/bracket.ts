import { hashSeed } from '../../services/auction/rng';
import { MatchResult } from '../match/matchTypes';
import {
  BracketMatch,
  BracketMatchStatus,
  TeamOutcome,
  TournamentBracket,
  TournamentFormat,
  TournamentRound,
  TournamentState,
  TournamentStatus,
} from './tournamentTypes';

/**
 * Tabellone fisso a 8 squadre:
 *   QF1 + QF2 -> SF1, QF3 + QF4 -> SF2, SF1 + SF2 -> F.
 * Il vincitore della partita "alta" va in casa, quello della "bassa" fuori.
 */

export const TOURNAMENT_SIZE = 8;
export const ROUNDS: TournamentRound[] = ['quarterfinals', 'semifinals', 'final'];

export const ROUND_LABELS: Record<TournamentRound, string> = {
  quarterfinals: 'Quarti di finale',
  semifinals: 'Semifinali',
  final: 'Finale',
};

export const ROUND_SHORT: Record<TournamentRound, string> = {
  quarterfinals: 'QF',
  semifinals: 'SF',
  final: 'F',
};

/**
 * Crea il tabellone vuoto con i semi deterministici delle 7 partite.
 * Nel formato 'double' quarti e semifinali sono confronti a due gare
 * (andata/ritorno, casa invertita, seme del ritorno dedicato); la finale
 * resta secca. I semi delle andate coincidono con quelli a gara secca.
 */
export function createBracket(tournamentSeed: number, format: TournamentFormat = 'single'): TournamentBracket {
  const m = (
    id: string,
    round: TournamentRound,
    index: number,
    next: BracketMatch['next']
  ): BracketMatch => ({
    id,
    round,
    index,
    homeId: null,
    awayId: null,
    seed: hashSeed(tournamentSeed, id),
    returnSeed: format === 'double' && round !== 'final' ? hashSeed(tournamentSeed, id, 'ritorno') : undefined,
    legs: format === 'double' && round !== 'final' ? 2 : 1,
    next,
    winnerId: null,
  });
  return [
    m('QF1', 'quarterfinals', 0, { matchId: 'SF1', slot: 'home' }),
    m('QF2', 'quarterfinals', 1, { matchId: 'SF1', slot: 'away' }),
    m('QF3', 'quarterfinals', 2, { matchId: 'SF2', slot: 'home' }),
    m('QF4', 'quarterfinals', 3, { matchId: 'SF2', slot: 'away' }),
    m('SF1', 'semifinals', 0, { matchId: 'F', slot: 'home' }),
    m('SF2', 'semifinals', 1, { matchId: 'F', slot: 'away' }),
    m('F', 'final', 0, null),
  ];
}

/** Riempie i quarti con l'ordine del sorteggio: [0] vs [1], [2] vs [3], ... */
export function fillQuarterfinals(bracket: TournamentBracket, order: string[]): TournamentBracket {
  return bracket.map(match =>
    match.round === 'quarterfinals'
      ? { ...match, homeId: order[match.index * 2], awayId: order[match.index * 2 + 1] }
      : match
  );
}

export function roundMatches(bracket: TournamentBracket, round: TournamentRound): BracketMatch[] {
  return bracket.filter(m => m.round === round).sort((a, b) => a.index - b.index);
}

export function findMatch(bracket: TournamentBracket, id: string): BracketMatch | undefined {
  return bracket.find(m => m.id === id);
}

/** Turno in corso (null durante il sorteggio o a torneo concluso) */
export function currentRound(status: TournamentStatus): TournamentRound | null {
  return status === 'draw' || status === 'completed' ? null : status;
}

// ----------------------------------------------------------------------------
// Andata e ritorno
// ----------------------------------------------------------------------------

/** Numero di gare del confronto (1 = secca, 2 = andata/ritorno) */
export function matchLegs(match: BracketMatch): 1 | 2 {
  return match.legs ?? 1;
}

/**
 * Chiave del risultato in `state.matches`: per la gara secca e l'andata è
 * l'id del confronto, per il ritorno `${id}-R`.
 */
export function legKey(matchId: string, leg: 1 | 2): string {
  return leg === 2 ? `${matchId}-R` : matchId;
}

/** Inverso di legKey */
export function parseLegKey(key: string): { matchId: string; leg: 1 | 2 } {
  return key.endsWith('-R') ? { matchId: key.slice(0, -2), leg: 2 } : { matchId: key, leg: 1 };
}

/** Prossima gara da giocare del confronto: 1 = andata, 2 = ritorno, null = finito */
export function nextLeg(state: TournamentState, match: BracketMatch): 1 | 2 | null {
  if (match.winnerId) return null;
  if (!state.matches[legKey(match.id, 1)]) return 1;
  return matchLegs(match) === 2 ? 2 : null;
}

/** Casa/ospiti della gara: al ritorno sono invertiti */
export function legSides(match: BracketMatch, leg: 1 | 2): { homeId: string | null; awayId: string | null } {
  return leg === 2 ? { homeId: match.awayId, awayId: match.homeId } : { homeId: match.homeId, awayId: match.awayId };
}

/** Seme della gara: dedicato per il ritorno */
export function legSeed(match: BracketMatch, leg: 1 | 2): number {
  return leg === 2 ? (match.returnSeed ?? match.seed) : match.seed;
}

/** Risultato della gara del confronto, se già giocata */
export function legResult(state: TournamentState, match: BracketMatch, leg: 1 | 2): MatchResult | undefined {
  return state.matches[legKey(match.id, leg)];
}

/** Gara in corso nel turno: 1 finché manca qualche andata, poi 2 */
export function roundLeg(state: TournamentState, round: TournamentRound): 1 | 2 {
  return roundMatches(state.bracket, round).some(m => !state.matches[legKey(m.id, 1)]) ? 1 : 2;
}

export interface TieScore {
  /** Gare giocate del confronto */
  played: 0 | 1 | 2;
  /** Totale gol dal punto di vista del tie: home = match.homeId */
  home: number;
  away: number;
  /** Rigori del ritorno convertiti ai lati del tie, se ci sono stati */
  shootout: { home: number; away: number } | null;
  /** Totale parziale: false finché non è finita l'andata */
  inProgress: boolean;
}

/** Punteggio complessivo del confronto (aggregato sui lati del tie) */
export function tieScore(state: TournamentState, match: BracketMatch): TieScore {
  const first = legResult(state, match, 1);
  const second = legResult(state, match, 2);
  if (!first) return { played: 0, home: 0, away: 0, shootout: null, inProgress: false };
  const home = first.homeScore + (second?.awayScore ?? 0);
  const away = first.awayScore + (second?.homeScore ?? 0);
  const shootout = second?.shootout ? { home: second.shootout.away, away: second.shootout.home } : null;
  return { played: second ? 2 : 1, home, away, shootout, inProgress: matchLegs(match) === 2 && !second };
}

/** Vincitore del confronto dopo il ritorno; null se la gara non decide */
export function tieWinner(match: BracketMatch, first: MatchResult, second: MatchResult): string | null {
  const totalHome = first.homeScore + second.awayScore;
  const totalAway = first.awayScore + second.homeScore;
  if (totalHome !== totalAway) return totalHome > totalAway ? match.homeId : match.awayId;
  if (!second.shootout) return null;
  return second.shootout.home > second.shootout.away ? match.awayId : match.homeId;
}

export function getMatchStatus(state: TournamentState, match: BracketMatch): BracketMatchStatus {
  if (match.winnerId) return 'completed';
  if (state.currentMatchId === match.id) return 'in_progress';
  if (!match.homeId || !match.awayId || currentRound(state.status) !== match.round) return 'upcoming';
  const leg = nextLeg(state, match);
  if (!leg) return 'upcoming';
  if (leg === 1) return 'ready';
  // Il ritorno si gioca solo quando tutte le andate del turno sono finite
  return roundMatches(state.bracket, match.round).every(m => state.matches[legKey(m.id, 1)])
    ? 'ready'
    : 'upcoming';
}

export function getTeamOutcome(match: BracketMatch, teamId: string | null): TeamOutcome {
  if (!match.winnerId || !teamId) return 'pending';
  return match.winnerId === teamId ? 'winner' : 'eliminated';
}

export function involves(match: BracketMatch, teamId: string): boolean {
  return match.homeId === teamId || match.awayId === teamId;
}

/** Partita dell'utente nel turno corrente, se ancora da giocare */
export function findUserMatch(state: TournamentState): BracketMatch | undefined {
  const round = currentRound(state.status);
  if (!round) return undefined;
  return roundMatches(state.bracket, round).find(m => involves(m, state.userTeamId) && !m.winnerId);
}

export function isUserEliminated(state: TournamentState): boolean {
  return state.bracket.some(m => m.winnerId && involves(m, state.userTeamId) && m.winnerId !== state.userTeamId);
}

/** Partite giocate (o da giocare) dall'utente, in ordine di turno */
export function userPath(state: TournamentState): BracketMatch[] {
  return ROUNDS.flatMap(r => roundMatches(state.bracket, r)).filter(m => involves(m, state.userTeamId));
}
