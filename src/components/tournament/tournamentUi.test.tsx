import { describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRng } from '../../services/auction/rng';
import { tournamentTeams } from '../../test/matchFixtures';
import {
  buildTournamentSummary,
  createTournament,
  drawOrder,
  findUserMatch,
  legKey,
  simulateBracketMatch,
  simulateRemaining,
  simulateRound,
  tournamentReducer,
} from '../../domain/tournament';
import { simulateMatch } from '../../domain/match';
import { strongTeam, weakTeam } from '../../test/matchFixtures';
import { TournamentBracket } from './TournamentBracket';
import { TournamentDraw } from './TournamentDraw';
import { TournamentHub } from './TournamentHub';
import { TournamentSummaryCard } from './TournamentSummaryCard';
import { summaryAlt } from './useSummaryCard';
import { MatchScreen } from '../match/MatchScreen';
import { MatchEnd } from '../match/MatchEnd';

const TEAMS = tournamentTeams();

function drawn(format: 'single' | 'double' = 'single') {
  const t = createTournament({ teams: TEAMS, seasonId: '2015-16', seed: 11, format });
  return tournamentReducer(t, { type: 'DRAW', order: drawOrder(t, createRng(11)) });
}

/** Torneo A/R con l'andata dell'utente già registrata e le altre simulate */
function drawnDoubleAfterFirstLegs() {
  const t1 = drawn('double');
  const tie = findUserMatch(t1)!;
  const first = simulateBracketMatch(t1, TEAMS, tie.id);
  const t2 = tournamentReducer(t1, { type: 'RECORD_RESULT', matchId: legKey(tie.id, 1), result: first });
  return { t: simulateRound(t2, TEAMS), tie: findUserMatch(t2)! };
}

const noop = () => {};

/** Guida la sequenza del sorteggio passo dopo passo (i timer nascono negli effetti) */
function runDraw() {
  for (let i = 0; i < 60; i++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
}

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
    fireEvent.click(screen.getByRole('button', { name: /Gioca i quarti/ }));
    expect(onPlay).toHaveBeenCalledWith(findUserMatch(t)!.id);
  });

  it('partita: al calcio d\'inizio chiede la tattica, poi arriva al fischio finale', () => {
    vi.useFakeTimers();
    const t = tournamentReducer(drawn(), { type: 'START_MATCH', matchId: findUserMatch(drawn())!.id });
    const onFinish = vi.fn();
    render(<MatchScreen tournament={t} teams={TEAMS} matchId={t.currentMatchId!} onFinish={onFinish} />);
    expect(screen.getByRole('dialog', { name: 'Scelta tattica' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Attacco/ })[0]);
    expect(screen.queryByRole('dialog', { name: 'Scelta tattica' })).not.toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Vai al risultato/ }));
    });
    // In caso di pareggio ci si ferma ai rigori: si conferma l'ordine e si salta la lotteria
    if (screen.queryByRole('dialog', { name: 'Ordine dei rigoristi' })) {
      fireEvent.click(screen.getByRole('button', { name: 'Conferma e si tira' }));
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /Vai al risultato/ }));
      });
    }
    expect(screen.getByText(/SEI PASSATO|ELIMINATO|CAMPIONE/)).toBeInTheDocument();
    const cta = screen.getByRole('button', { name: /Vai alla semifinale|Concludi torneo/ });
    fireEvent.click(cta);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][0].decisionTicks).toHaveLength(3);
    vi.useRealTimers();
  });

  it('hub A/R: "Gioca l\'andata" all\'inizio, poi il tracker con l\'aggregato e "Gioca il ritorno"', () => {
    const t0 = drawn('double');
    render(<TournamentHub tournament={t0} onPlay={noop} onCompleteRound={noop} onSummary={noop} />);
    expect(screen.getByRole('button', { name: "Gioca l'andata dei quarti" })).toBeInTheDocument();
    cleanup();

    const { t } = drawnDoubleAfterFirstLegs();
    render(<TournamentHub tournament={t} onPlay={noop} onCompleteRound={noop} onSummary={noop} />);
    expect(screen.getByRole('button', { name: 'Gioca il ritorno dei quarti' })).toBeInTheDocument();
    // Tracker del confronto: le due gare e l'aggregato parziale
    expect(screen.getByText('Andata')).toBeInTheDocument();
    expect(screen.getByText('Ritorno')).toBeInTheDocument();
    expect(screen.getByText(/Totale \d+-\d+/)).toBeInTheDocument();
  });

  it('MatchEnd all\'andata: "FINE ANDATA" e un solo "Avanti: ritorno", mai eliminazione', () => {
    const result = simulateMatch({
      home: strongTeam(),
      away: weakTeam(),
      seed: 3,
      options: { twoLegged: { leg: 1 } },
    });
    render(
      <MatchEnd
        result={result}
        userTeamId={result.homeTeamId}
        round="quarterfinals"
        leg={1}
        onContinue={noop}
        onConclude={noop}
      />
    );
    expect(screen.getByText('FINE ANDATA')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent('Vai al ritorno');
  });

  it('sorteggio: apre sul tabellone vuoto, si riempie e chiama onDrawn una volta', () => {
    vi.useFakeTimers();
    const t = createTournament({ teams: TEAMS, seasonId: '2015-16', seed: 11 });
    const order = t.teams.map(x => x.id);
    const onDrawn = vi.fn();
    const onDone = vi.fn();
    const { container } = render(<TournamentDraw tournament={t} order={order} onDrawn={onDrawn} onDone={onDone} />);

    // 8 slot vuoti (layout mobile + desktop) e la coppa al centro
    expect(container.querySelectorAll('[data-draw-slot]')).toHaveLength(16);
    expect(container.querySelectorAll('[data-draw-cup]').length).toBeGreaterThan(0);
    expect(screen.getAllByText('In attesa del sorteggio')).toHaveLength(16);

    runDraw();

    for (const team of t.teams) expect(screen.getAllByText(team.name).length).toBeGreaterThan(0);
    expect(onDrawn).toHaveBeenCalledTimes(1);
    expect(onDrawn).toHaveBeenCalledWith(order);
    expect(onDone).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Vai al torneo' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('sorteggio: skip -> tabellone completo subito, stessa uscita', () => {
    vi.useFakeTimers();
    const t = createTournament({ teams: TEAMS, seasonId: '2015-16', seed: 11 });
    const order = t.teams.map(x => x.id);
    const onDrawn = vi.fn();
    const onDone = vi.fn();
    render(<TournamentDraw tournament={t} order={order} onDrawn={onDrawn} onDone={onDone} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salta il sorteggio' }));
    for (const team of t.teams) expect(screen.getAllByText(team.name).length).toBeGreaterThan(0);
    expect(onDrawn).toHaveBeenCalledTimes(1);
    expect(onDrawn).toHaveBeenCalledWith(order);
    expect(onDone).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Vai al torneo' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('sorteggio: il Quarto 1 accoppia order[0] e order[1]', () => {
    vi.useFakeTimers();
    const t = createTournament({ teams: TEAMS, seasonId: '2015-16', seed: 11 });
    const order = t.teams.map(x => x.id);
    const { container } = render(<TournamentDraw tournament={t} order={order} onDone={noop} />);
    runDraw();
    const name = (j: number) => t.teams.find(x => x.id === order[j])!.name;
    expect(container.querySelector('[data-draw-slot="0"]')).toHaveTextContent(name(0));
    expect(container.querySelector('[data-draw-slot="1"]')).toHaveTextContent(name(1));
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
