import { hashSeed } from '../../services/auction/rng';
import {
  BracketMatch,
  BracketMatchStatus,
  TeamOutcome,
  TournamentBracket,
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

/** Crea il tabellone vuoto con i semi deterministici delle 7 partite */
export function createBracket(tournamentSeed: number): TournamentBracket {
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

export function getMatchStatus(state: TournamentState, match: BracketMatch): BracketMatchStatus {
  if (match.winnerId) return 'completed';
  if (state.currentMatchId === match.id) return 'in_progress';
  if (match.homeId && match.awayId && currentRound(state.status) === match.round) return 'ready';
  return 'upcoming';
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
