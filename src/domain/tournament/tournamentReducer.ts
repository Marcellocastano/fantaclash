import { fillQuarterfinals, findMatch, getMatchStatus, roundMatches, TOURNAMENT_SIZE } from './bracket';
import { TournamentAction, TournamentState, TournamentStatus } from './tournamentTypes';

/**
 * Macchina a stati del torneo. Come per l'asta:
 * azione invalida -> stessa referenza dello stato.
 *
 * draw -> quarterfinals -> semifinals -> final -> completed
 */

const NEXT_STATUS: Record<TournamentStatus, TournamentStatus> = {
  draw: 'quarterfinals',
  quarterfinals: 'semifinals',
  semifinals: 'final',
  final: 'completed',
  completed: 'completed',
};

export function tournamentReducer(state: TournamentState, action: TournamentAction): TournamentState {
  switch (action.type) {
    case 'DRAW': {
      if (state.status !== 'draw') return state;
      const ids = new Set(state.teams.map(t => t.id));
      const { order } = action;
      if (order.length !== TOURNAMENT_SIZE || new Set(order).size !== order.length) return state;
      if (!order.every(id => ids.has(id))) return state;
      return { ...state, bracket: fillQuarterfinals(state.bracket, order), status: 'quarterfinals' };
    }

    case 'START_MATCH': {
      const match = findMatch(state.bracket, action.matchId);
      if (!match || state.currentMatchId) return state;
      if (getMatchStatus(state, match) !== 'ready') return state;
      return { ...state, currentMatchId: match.id };
    }

    case 'LEAVE_MATCH':
      return state.currentMatchId ? { ...state, currentMatchId: null } : state;

    case 'RECORD_RESULT': {
      const match = findMatch(state.bracket, action.matchId);
      if (!match) return state;
      const status = getMatchStatus(state, match);
      if (status !== 'ready' && status !== 'in_progress') return state;
      const { result } = action;
      if (result.homeTeamId !== match.homeId || result.awayTeamId !== match.awayId) return state;
      if (result.winnerId !== match.homeId && result.winnerId !== match.awayId) return state;

      const winnerId = result.winnerId;
      let bracket = state.bracket.map(m => (m.id === match.id ? { ...m, winnerId } : m));
      if (match.next) {
        const { matchId, slot } = match.next;
        bracket = bracket.map(m =>
          m.id === matchId ? { ...m, [slot === 'home' ? 'homeId' : 'awayId']: winnerId } : m
        );
      }
      const roundDone = roundMatches(bracket, match.round).every(m => m.winnerId);
      const nextStatus = roundDone ? NEXT_STATUS[state.status] : state.status;
      return {
        ...state,
        bracket,
        matches: { ...state.matches, [match.id]: result },
        currentMatchId: state.currentMatchId === match.id ? null : state.currentMatchId,
        status: nextStatus,
        winnerId: nextStatus === 'completed' ? winnerId : state.winnerId,
      };
    }

    default:
      return state;
  }
}
