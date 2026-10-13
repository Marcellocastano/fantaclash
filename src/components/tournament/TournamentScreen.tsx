import { useCallback, useState } from 'react';
import { useTournamentController } from '../../hooks/tournamentController';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { MatchResult } from '../../domain/match';
import {
  currentStageMatches,
  findCompetitionMatch,
  simulateStage,
  tournamentReducer,
  TournamentState,
} from '../../domain/tournament';
import { autoLineup } from '../../domain/teams/formations';
import { LineupScreen } from '../lineup/LineupScreen';
import { MatchExit, MatchScreen } from '../match/MatchScreen';
import { TournamentDraw } from './TournamentDraw';
import { TournamentHub } from './TournamentHub';
import { GroupStageHub } from './GroupStageHub';

export function TournamentScreen() {
  const {
    tournament,
    teams,
    myTeamId,
    dispatchTournament: act,
    setTournament: save,
    setLineup,
    finishTournament,
  } = useTournamentController();
  const [showDraw, setShowDraw] = useState(tournament?.status === 'draw');
  const [revealIds, setRevealIds] = useState<string[]>([]);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  useScrollToTop(showDraw ? 'draw' : editingMatchId ?? tournament?.currentMatchId ?? 'hub');

  const onDrawn = useCallback((order: string[]) => act({ type: 'DRAW', order }), [act]);
  const onDrawDone = useCallback(() => setShowDraw(false), []);

  if (!tournament) return null;

  const completeRound = (from: TournamentState) => {
    const active = currentStageMatches(from);
    const next = simulateStage(from, teams);
    setRevealIds(active.filter(match => !from.matches[match.id] && next.matches[match.id]).map(match => match.id));
    return next;
  };

  if (showDraw) {
    return <TournamentDraw tournament={tournament} onDrawn={onDrawn} onDone={onDrawDone} />;
  }

  if (editingMatchId) {
    const match = findCompetitionMatch(tournament, editingMatchId);
    const team = teams.find(candidate => candidate.id === myTeamId);
    if (!match || !team) return null;
    return (
      <LineupScreen
        key={editingMatchId}
        team={team}
        initialLineup={team.lineup ?? autoLineup(team.roster, '2-3-2')}
        title="Prepara la formazione"
        description={`Modulo ${team.lineup?.formation ?? '2-3-2'} predefinito: puoi confermarlo o cambiare titolari per questa partita.`}
        submitLabel="Scendi in campo"
        onCancel={() => setEditingMatchId(null)}
        onConfirm={lineup => {
          setLineup(team.id, lineup);
          setEditingMatchId(null);
          setRevealIds([]);
          act({ type: 'START_MATCH', matchId: editingMatchId });
        }}
      />
    );
  }

  if (tournament.currentMatchId) {
    const matchId = tournament.currentMatchId;
    const onFinish = (result: MatchResult, exit: MatchExit) => {
      const recorded = tournamentReducer(tournament, { type: 'RECORD_RESULT', matchId, result });
      if (exit === 'conclude' || recorded.status === 'completed') return finishTournament(recorded);
      save(completeRound(recorded));
    };
    return <MatchScreen key={matchId} tournament={tournament} teams={teams} matchId={matchId} onFinish={onFinish} />;
  }

  if (tournament.format === 'groups') {
    return (
      <GroupStageHub
        tournament={tournament}
        onPlay={matchId => setEditingMatchId(matchId)}
        onSummary={() => finishTournament()}
      />
    );
  }

  return (
    <TournamentHub
      tournament={tournament}
      revealIds={revealIds}
      onPlay={matchId => setEditingMatchId(matchId)}
      onCompleteRound={() => save(completeRound(tournament))}
      onSummary={() => finishTournament()}
    />
  );
}
