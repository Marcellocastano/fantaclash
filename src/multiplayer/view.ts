import { Team } from '../types';
import { TournamentState } from '../domain/tournament';
import { RoomState } from './protocol';

/**
 * Proiezione dello stato di stanza per uno spettatore/giocatore:
 * la UI esistente ragiona su `isUserTeam`, quindi la squadra del
 * viewer (e la sua controparte nel torneo) viene marcata come tale.
 * myPlayerId null -> nessuna squadra è "dell'utente" (spettatore).
 */
export interface ViewerProjection {
  teams: Team[];
  tournament: TournamentState | null;
  myTeamId: string | null;
}

export function projectForViewer(state: RoomState, myPlayerId: string | null): ViewerProjection {
  const myTeam = myPlayerId
    ? state.teams.find(t => t.ownerId === myPlayerId)
    : undefined;
  const myTeamId = myTeam?.id ?? null;

  const teams = state.teams.map(t =>
    t.isUserTeam !== (t.id === myTeamId) ? { ...t, isUserTeam: t.id === myTeamId } : t
  );

  const tournament = state.tournament
    ? {
        ...state.tournament,
        userTeamId: myTeamId ?? '',
        teams: state.tournament.teams.map(tt =>
          tt.isUserTeam !== (tt.id === myTeamId) ? { ...tt, isUserTeam: tt.id === myTeamId } : tt
        ),
      }
    : null;

  return { teams, tournament, myTeamId };
}
