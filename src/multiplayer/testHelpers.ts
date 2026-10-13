import { bestLineup } from '../domain/teams/formations';
import { RoomAction, RoomState } from './protocol';
import { roomReducer } from './roomReducer';

export function postAuctionLineupActions(state: RoomState): RoomAction[] {
  const teamIds = state.teams.filter(team => team.controller !== 'bot').map(team => team.id);
  const lineups = Object.fromEntries(state.teams.map(team => [
    team.id,
    bestLineup(team.roster, team.botConfig?.preferredFormation ?? '2-3-2'),
  ]));
  return [
    { type: 'LINEUP_WINDOW', window: { deadline: 60_000, kind: 'post_auction', teamIds } },
    { type: 'SET_LINEUPS', lineups },
  ];
}

export function startPreparedRoomTournament(state: RoomState, seed: number): RoomState {
  let next = state;
  for (const action of postAuctionLineupActions(next)) next = roomReducer(next, action);
  return roomReducer(next, { type: 'START_TOURNAMENT', seed });
}
