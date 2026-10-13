import { useCallback, useState } from 'react';
import { useTournamentController } from '../../hooks/tournamentController';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { MatchResult } from '../../domain/match';
import {
  legKey,
  nextLeg,
  simulateRound,
  tournamentReducer,
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
  const {
    tournament,
    teams,
    dispatchTournament: act,
    setTournament: save,
    finishTournament,
  } = useTournamentController();
  const [showDraw, setShowDraw] = useState(tournament?.status === 'draw');
  const [revealIds, setRevealIds] = useState<string[]>([]);
  useScrollToTop(showDraw ? 'draw' : tournament?.currentMatchId ?? 'hub');

  const onDrawn = useCallback((order: string[]) => act({ type: 'DRAW', order }), [act]);
  const onDrawDone = useCallback(() => setShowDraw(false), []);

  if (!tournament) return null;

  /** Simula le gare rimaste del turno e ne prepara la rivelazione (per chiave) */
  const completeRound = (from: TournamentState) => {
    const next = simulateRound(from, teams);
    const simulated = Object.keys(next.matches).filter(k => !(k in from.matches));
    setRevealIds(simulated);
    return next;
  };

  if (showDraw) {
    return <TournamentDraw tournament={tournament} onDrawn={onDrawn} onDone={onDrawDone} />;
  }

  if (tournament.currentMatchId) {
    const matchId = tournament.currentMatchId;
    const match = tournament.bracket.find(m => m.id === matchId);
    const leg = match ? (nextLeg(tournament, match) ?? 1) : 1;
    const key = legKey(matchId, leg as 1 | 2);
    const onFinish = (result: MatchResult, exit: MatchExit) => {
      const recorded = tournamentReducer(tournament, { type: 'RECORD_RESULT', matchId: key, result });
      if (exit === 'conclude' || recorded.status === 'completed') return finishTournament(recorded);
      save(completeRound(recorded));
    };
    // key per gara: al ritorno la schermata riparte da capo
    return <MatchScreen key={key} tournament={tournament} teams={teams} matchId={matchId} onFinish={onFinish} />;
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
