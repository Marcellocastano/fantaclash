import { useMemo } from 'react';
import { autoLineup } from '../../domain/teams/formations';
import { randomTournamentSeed } from '../../domain/tournament';
import { useGame } from '../../context/GameContext';
import { GameShell } from '../layout/GameShell';
import { LineupScreen } from '../lineup/LineupScreen';

export default function LineupPhase() {
  const { state, dispatch } = useGame();
  const user = state.teams.find(team => team.isUserTeam);
  const initialLineup = useMemo(() => {
    if (!user) return undefined;
    return user.lineup ?? autoLineup(user.roster, '2-3-2');
  }, [user]);
  if (!user || !initialLineup) return null;
  return (
    <GameShell>
      <LineupScreen
        team={user}
        initialLineup={initialLineup}
        title="Componi la squadra"
        description="Scegli il tuo modulo predefinito e gli otto titolari. Lo potrai modificare prima di ogni partita."
        submitLabel="Conferma e sorteggia"
        onConfirm={lineup => {
          dispatch({ type: 'SET_TEAM_LINEUP', payload: { teamId: user.id, lineup } });
          dispatch({ type: 'START_TOURNAMENT', payload: { seed: randomTournamentSeed() } });
        }}
      />
    </GameShell>
  );
}
