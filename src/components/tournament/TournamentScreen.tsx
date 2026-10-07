import { useCallback, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { MatchResult } from '../../domain/match';
import {
  findUserMatch,
  simulateBracketMatch,
  simulateRemaining,
  simulateRound,
  tournamentReducer,
  TournamentAction,
} from '../../domain/tournament';
import { MatchExit, MatchScreen } from '../match/MatchScreen';
import { MatchSimSummary } from './MatchSimSummary';
import { TournamentDraw } from './TournamentDraw';
import { TournamentHub } from './TournamentHub';

/**
 * Contenitore della fase TORNEO: sorteggio -> hub -> partita.
 * Tutta la logica passa dal dominio (tournamentReducer, simulate*);
 * qui si traducono solo i click in azioni.
 */
export function TournamentScreen() {
  const { state, dispatch, resetGame } = useGame();
  const tournament = state.tournament;
  const teams = state.teams;
  const [showDraw, setShowDraw] = useState(tournament?.status === 'draw');
  const [quickSim, setQuickSim] = useState<{ matchId: string; result: MatchResult } | null>(null);

  const act = useCallback(
    (action: TournamentAction) => dispatch({ type: 'TOURNAMENT_ACTION', payload: action }),
    [dispatch]
  );

  if (!tournament) return null;

  const finishTournament = (next = tournament) => {
    dispatch({ type: 'SET_TOURNAMENT', payload: simulateRemaining(next, teams) });
    dispatch({ type: 'SET_PHASE', payload: 'FINALE' });
  };

  if (showDraw) {
    return (
      <TournamentDraw
        tournament={tournament}
        onDrawn={order => act({ type: 'DRAW', order })}
        onStart={() => setShowDraw(false)}
      />
    );
  }

  if (tournament.currentMatchId) {
    const onFinish = (result: MatchResult, exit: MatchExit) => {
      const next = tournamentReducer(tournament, {
        type: 'RECORD_RESULT',
        matchId: tournament.currentMatchId as string,
        result,
      });
      if (exit === 'conclude') finishTournament(next);
      else dispatch({ type: 'SET_TOURNAMENT', payload: exit === 'view' ? simulateRemaining(next, teams) : next });
    };
    return (
      <MatchScreen
        key={tournament.currentMatchId}
        tournament={tournament}
        teams={teams}
        matchId={tournament.currentMatchId}
        onFinish={onFinish}
      />
    );
  }

  const team = (id: string | null) => tournament.teams.find(t => t.id === id);
  const simMatch = quickSim ? tournament.bracket.find(m => m.id === quickSim.matchId) : undefined;

  return (
    <>
      <TournamentHub
        tournament={tournament}
        onPlay={matchId => act({ type: 'START_MATCH', matchId })}
        onSimulate={matchId => setQuickSim({ matchId, result: simulateBracketMatch(tournament, teams, matchId) })}
        onSimulateOthers={() => {
          const userMatch = findUserMatch(tournament);
          dispatch({
            type: 'SET_TOURNAMENT',
            payload: simulateRound(tournament, teams, userMatch ? [userMatch.id] : []),
          });
        }}
        onSimulateRest={() => dispatch({ type: 'SET_TOURNAMENT', payload: simulateRemaining(tournament, teams) })}
        onConclude={() => finishTournament()}
        onReset={resetGame}
      />
      {quickSim && simMatch && (
        <MatchSimSummary
          result={quickSim.result}
          home={team(simMatch.homeId)}
          away={team(simMatch.awayId)}
          onClose={() => {
            act({ type: 'RECORD_RESULT', matchId: quickSim.matchId, result: quickSim.result });
            setQuickSim(null);
          }}
        />
      )}
    </>
  );
}
