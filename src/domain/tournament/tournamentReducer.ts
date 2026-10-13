import { fillQuarterfinals, findMatch, getMatchStatus, roundMatches, TOURNAMENT_SIZE } from './bracket';
import { buildGroupStage, computeStandings, currentGroupMatchday } from './groups';
import { TournamentAction, TournamentState, TournamentStatus } from './tournamentTypes';

/**
 * Macchina a stati del torneo. Come per l'asta:
 * azione invalida -> stessa referenza dello stato.
 *
 * draw -> gruppi o quarti -> semifinali -> finali -> completed
 */

const NEXT_STATUS: Partial<Record<TournamentStatus, TournamentStatus>> = {
  quarterfinals: 'semifinals',
  semifinals: 'final',
  final: 'completed',
};

function groupFixtureStatus(state: TournamentState, id: string): 'ready' | 'completed' | 'upcoming' | 'in_progress' {
  if (state.matches[id]) return 'completed';
  if (state.currentMatchId === id) return 'in_progress';
  const fixture = state.groups?.fixtures.find(candidate => candidate.id === id);
  if (!fixture || state.status !== 'groups') return 'upcoming';
  return fixture.matchday === currentGroupMatchday(state) ? 'ready' : 'upcoming';
}

function bracketMatchReady(state: TournamentState, match: ReturnType<typeof findMatch>): boolean {
  if (!match) return false;
  if (state.format === 'groups' && state.status === 'final' && match.round === 'third_place') {
    return !!match.homeId && !!match.awayId && !match.winnerId;
  }
  return getMatchStatus(state, match) === 'ready';
}

function propagate(bracket: TournamentState['bracket'], link: NonNullable<ReturnType<typeof findMatch>>['next'], teamId: string): TournamentState['bracket'] {
  if (!link) return bracket;
  return bracket.map(match => match.id === link.matchId
    ? { ...match, [link.slot === 'home' ? 'homeId' : 'awayId']: teamId }
    : match
  );
}

export function tournamentReducer(state: TournamentState, action: TournamentAction): TournamentState {
  switch (action.type) {
    case 'DRAW': {
      if (state.status !== 'draw') return state;
      const ids = new Set(state.teams.map(t => t.id));
      const { order } = action;
      if (order.length !== TOURNAMENT_SIZE || new Set(order).size !== order.length) return state;
      if (!order.every(id => ids.has(id))) return state;
      if (state.format === 'groups') {
        return {
          ...state,
          groups: buildGroupStage(order, Number.parseInt(state.id.replace('cup-', ''), 36) || 0),
          status: 'groups',
        };
      }
      return { ...state, bracket: fillQuarterfinals(state.bracket, order), status: 'quarterfinals' };
    }

    case 'START_MATCH': {
      if (state.currentMatchId) return state;
      if (groupFixtureStatus(state, action.matchId) === 'ready') {
        return { ...state, currentMatchId: action.matchId };
      }
      const match = findMatch(state.bracket, action.matchId);
      if (!bracketMatchReady(state, match)) return state;
      return { ...state, currentMatchId: action.matchId };
    }

    case 'LEAVE_MATCH':
      return state.currentMatchId ? { ...state, currentMatchId: null } : state;

    case 'RECORD_RESULT': {
      const { result } = action;
      const fixture = state.groups?.fixtures.find(candidate => candidate.id === action.matchId);
      if (fixture) {
        if (state.status !== 'groups' || groupFixtureStatus(state, fixture.id) !== 'ready' && groupFixtureStatus(state, fixture.id) !== 'in_progress') return state;
        if (result.homeTeamId !== fixture.homeId || result.awayTeamId !== fixture.awayId) return state;
        if (result.homeScore === result.awayScore ? result.winnerId !== null || result.shootout !== null : result.winnerId !== (result.homeScore > result.awayScore ? fixture.homeId : fixture.awayId)) return state;
        const matches = { ...state.matches, [fixture.id]: result };
        const finishedGroups = state.groups!.fixtures.every(item => !!matches[item.id]);
        if (!finishedGroups) {
          return {
            ...state,
            matches,
            currentMatchId: state.currentMatchId === fixture.id ? null : state.currentMatchId,
          };
        }
        const nextState = { ...state, matches };
        const firstA = computeStandings(nextState, 'A')[0]?.teamId;
        const secondA = computeStandings(nextState, 'A')[1]?.teamId;
        const firstB = computeStandings(nextState, 'B')[0]?.teamId;
        const secondB = computeStandings(nextState, 'B')[1]?.teamId;
        if (!firstA || !secondA || !firstB || !secondB) return state;
        const bracket = state.bracket.map(match => match.id === 'SF1'
          ? { ...match, homeId: firstA, awayId: secondB }
          : match.id === 'SF2'
            ? { ...match, homeId: firstB, awayId: secondA }
            : match
        );
        return { ...state, matches, bracket, currentMatchId: null, status: 'semifinals' };
      }

      const match = findMatch(state.bracket, action.matchId);
      if (!match || (!bracketMatchReady(state, match) && getMatchStatus(state, match) !== 'in_progress')) return state;
      if (!result.winnerId || result.homeTeamId !== match.homeId || result.awayTeamId !== match.awayId) return state;
      if (result.winnerId !== match.homeId && result.winnerId !== match.awayId) return state;
      if (result.homeScore === result.awayScore && !result.shootout) return state;

      let bracket = state.bracket.map(item => item.id === match.id ? { ...item, winnerId: result.winnerId } : item);
      bracket = propagate(bracket, match.next, result.winnerId);
      if (match.loserNext) {
        const loserId = result.winnerId === match.homeId ? match.awayId : match.homeId;
        if (loserId) bracket = propagate(bracket, match.loserNext, loserId);
      }
      const matches = { ...state.matches, [match.id]: result };
      let status = state.status;
      let winnerId = state.winnerId;
      if (state.format === 'groups') {
        if (state.status === 'semifinals' && roundMatches(bracket, 'semifinals').every(item => !!item.winnerId)) status = 'final';
        if (state.status === 'final' && roundMatches(bracket, 'final').every(item => !!item.winnerId) && roundMatches(bracket, 'third_place').every(item => !!item.winnerId)) {
          status = 'completed';
          winnerId = findMatch(bracket, 'F')?.winnerId ?? null;
        }
      } else {
        const roundDone = roundMatches(bracket, match.round).every(item => !!item.winnerId);
        if (roundDone) status = NEXT_STATUS[state.status] ?? state.status;
        if (status === 'completed') winnerId = result.winnerId;
      }
      return {
        ...state,
        bracket,
        matches,
        currentMatchId: state.currentMatchId === match.id ? null : state.currentMatchId,
        status,
        winnerId,
      };
    }

    default:
      return state;
  }
}
