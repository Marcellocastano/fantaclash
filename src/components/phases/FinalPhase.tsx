import { LocalTournamentProvider } from '../../hooks/tournamentController';
import { TournamentSummaryScreen } from '../tournament/TournamentSummaryScreen';

/** Schermata finale del gioco singolo (chunk lazy) */
export default function FinalPhase() {
  return (
    <LocalTournamentProvider>
      <TournamentSummaryScreen />
    </LocalTournamentProvider>
  );
}
