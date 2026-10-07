import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRng } from '../../services/auction/rng';
import { tournamentTeams } from '../../test/matchFixtures';
import {
  buildTournamentSummary,
  createTournament,
  drawOrder,
  findUserMatch,
  simulateRemaining,
  tournamentReducer,
} from '../../domain/tournament';
import { TournamentBracket } from './TournamentBracket';
import { TournamentHub } from './TournamentHub';
import { TournamentSummaryCard } from './TournamentSummaryCard';
import { summaryAlt } from './useSummaryCard';
import { MatchScreen } from '../match/MatchScreen';

const TEAMS = tournamentTeams();

function drawn() {
  const t = createTournament({ teams: TEAMS, seasonId: '2015-16', seed: 11 });
  return tournamentReducer(t, { type: 'DRAW', order: drawOrder(t, createRng(11)) });
}

const noop = () => {};

describe('UI torneo (smoke)', () => {
  it('il tabellone mostra le 8 squadre e il campione da decidere', () => {
    render(<TournamentBracket tournament={drawn()} />);
    for (const team of TEAMS) expect(screen.getAllByText(team.name).length).toBeGreaterThan(0);
    expect(screen.getByText('Da decidere')).toBeInTheDocument();
  });

  it('hub: un solo pulsante principale per la partita dell\'utente', () => {
    const t = drawn();
    const onPlay = vi.fn();
    render(<TournamentHub tournament={t} onPlay={onPlay} onCompleteRound={noop} onSummary={noop} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Gioca i quarti di finale/ }));
    expect(onPlay).toHaveBeenCalledWith(findUserMatch(t)!.id);
  });

  it('partita: al calcio d\'inizio chiede la tattica, poi arriva al fischio finale', () => {
    vi.useFakeTimers();
    const t = tournamentReducer(drawn(), { type: 'START_MATCH', matchId: findUserMatch(drawn())!.id });
    const onFinish = vi.fn();
    render(<MatchScreen tournament={t} teams={TEAMS} matchId={t.currentMatchId!} onFinish={onFinish} />);
    expect(screen.getByRole('dialog', { name: 'Scelta tattica' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Attacca/ }));
    expect(screen.queryByRole('dialog', { name: 'Scelta tattica' })).not.toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Fischio finale/ }));
    });
    // In caso di pareggio ci si ferma ai rigori: si conferma l'ordine e si salta la lotteria
    if (screen.queryByRole('dialog', { name: 'Ordine dei rigoristi' })) {
      fireEvent.click(screen.getByRole('button', { name: 'Conferma e si tira' }));
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /Fischio finale/ }));
      });
    }
    expect(screen.getByText(/PASSI IL TURNO|ELIMINATO|CAMPIONE/)).toBeInTheDocument();
    const cta = screen.getByRole('button', { name: /Avanti: semifinale|Concludi torneo/ });
    fireEvent.click(cta);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][0].decisionTicks).toHaveLength(3);
    vi.useRealTimers();
  });

  it('card del torneo: descrizione accessibile con esito, squadra e risultati', () => {
    const t = simulateRemaining(drawn(), TEAMS);
    const summary = buildTournamentSummary(t, TEAMS);
    render(<TournamentSummaryCard summary={summary} url={null} failed />);
    const alt = summaryAlt(summary);
    expect(alt).toContain(summary.placementLabel);
    expect(alt).toContain(summary.teamName);
    expect(screen.getByRole('img', { name: alt })).toBeInTheDocument();
  });
});
