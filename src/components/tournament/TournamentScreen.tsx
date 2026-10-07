import { useCallback, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { MatchResult } from '../../domain/match';
import {
  simulateRemaining,
  simulateRound,
  tournamentReducer,
  TournamentAction,
  TournamentState,
} from '../../domain/tournament';
import { MatchExit, MatchScreen } from '../match/MatchScreen';
import { TournamentDraw } from './TournamentDraw';
import { TournamentHub } from './TournamentHub';

/**
 * Contenitore della fase TORNEO: sorteggio -> hub -> partita.
 * Tutta la logica passa dal dominio (tournamentReducer, simulate*);
 * qui si traducono solo i click in azioni. Quando finisce la partita
 * dell'utente, le altre del turno si simulano subito e l'hub ne rivela i
 * risultati.
 */
export function TournamentScreen() {
  const { state, dispatch } = useGame();
  const tournament = state.tournament;
  const teams = state.teams;
  const [showDraw, setShowDraw] = useState(tournament?.status === 'draw');
  const [revealIds, setRevealIds] = useState<string[]>([]);

  const act = useCallback(
    (action: TournamentAction) => dispatch({ type: 'TOURNAMENT_ACTION', payload: action }),
    [dispatch]
  );
  const onDrawn = useCallback((order: string[]) => act({ type: 'DRAW', order }), [act]);
  const onDrawDone = useCallback(() => setShowDraw(false), []);

  if (!tournament) return null;

  const save = (next: TournamentState) => dispatch({ type: 'SET_TOURNAMENT', payload: next });
  const finishTournament = (next: TournamentState = tournament) => {
    save(simulateRemaining(next, teams));
    dispatch({ type: 'SET_PHASE', payload: 'FINALE' });
  };

  /** Simula le partite rimaste del turno e ne prepara la rivelazione */
  const completeRound = (from: TournamentState) => {
    const next = simulateRound(from, teams);
    const simulated = from.bracket.filter(m => !m.winnerId && next.matches[m.id]).map(m => m.id);
    setRevealIds(simulated);
    return next;
  };

  if (showDraw) {
    return <TournamentDraw tournament={tournament} onDrawn={onDrawn} onDone={onDrawDone} />;
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

  return (
    <TournamentHub
      tournament={tournament}
      revealIds={revealIds}
      onPlay={matchId => {
        setRevealIds([]);
        act({ type: 'START_MATCH', matchId });
      }}
      onCompleteRound={() => save(completeRound(tournament))}
      onSummary={() => finishTournament()}
    />
  );
}
