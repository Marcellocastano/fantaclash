import { useMemo } from 'react';
import { TournamentController } from '../../hooks/tournamentController';
import { projectForViewer } from '../../multiplayer/view';
import { useRoom } from './RoomProvider';

const noop = () => {};

/**
 * Controller del torneo in stanza: vista proiettata per il viewer.
 * Le mutazioni locali sono no-op: lo stato cambia solo via RoomAction
 * dell'host (START_TOURNAMENT / TOURNAMENT / MATCH_RECORD / FINISH).
 */
export function useRoomTournament(): TournamentController {
  const { state, me, leave } = useRoom();
  const projection = useMemo(
    () => (state ? projectForViewer(state, me) : null),
    [state, me]
  );

  return {
    tournament: projection?.tournament ?? null,
    teams: projection?.teams ?? [],
    myTeamId: projection?.myTeamId ?? null,
    dispatchTournament: noop,
    setTournament: noop,
    finishTournament: noop,
    resetGame: () => void leave(),
    inRoom: true,
    finalLabel: 'Esci dalla stanza',
  };
}
