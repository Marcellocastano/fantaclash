import { LocalTournamentProvider } from '../../hooks/tournamentController';
import { TournamentScreen } from '../tournament/TournamentScreen';

/** Fase TORNEO del gioco singolo (chunk lazy) */
export default function TournamentPhase() {
  return (
    <LocalTournamentProvider>
      <TournamentScreen />
    </LocalTournamentProvider>
  );
}
