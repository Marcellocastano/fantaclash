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
import { MatchScreen } from '../match/MatchScreen';

// ThemeToggle legge localStorage, non disponibile in modo affidabile in jsdom con Node recenti
vi.mock('../ThemeToggle', () => ({ ThemeToggle: () => null }));

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

  it('hub: Gioca per la partita dell\'utente, Simula per le altre', () => {
    const t = drawn();
    const onPlay = vi.fn();
    const onSimulate = vi.fn();
    render(
      <TournamentHub
        tournament={t}
        onPlay={onPlay}
        onSimulate={onSimulate}
        onSimulateOthers={noop}
        onSimulateRest={noop}
        onConclude={noop}
        onReset={noop}
      />
    );
    expect(screen.getAllByRole('button', { name: /^Simula$/ })).toHaveLength(3);
    fireEvent.click(screen.getAllByRole('button', { name: /Gioca/ })[0]);
    expect(onPlay).toHaveBeenCalledWith(findUserMatch(t)!.id);
    fireEvent.click(screen.getAllByRole('button', { name: /^Simula$/ })[0]);
    expect(onSimulate).toHaveBeenCalled();
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
    expect(screen.getByText(/Passi il turno!|Eliminato/)).toBeInTheDocument();
    const cta = screen.queryByRole('button', { name: 'Continua' }) ?? screen.getByRole('button', { name: 'Concludi torneo' });
    fireEvent.click(cta);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][0].decisionTicks).toHaveLength(3);
    vi.useRealTimers();
  });

  it('card del torneo: posizione, squadra e formazione', () => {
    const t = simulateRemaining(drawn(), TEAMS);
    const summary = buildTournamentSummary(t, TEAMS);
    render(<TournamentSummaryCard summary={summary} />);
    expect(screen.getByText(summary.placementLabel)).toBeInTheDocument();
    expect(screen.getByText(summary.teamName)).toBeInTheDocument();
    expect(screen.getByText('POR')).toBeInTheDocument();
  });
});
