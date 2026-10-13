import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createRng } from '../../services/auction/rng';
import { tournamentTeams } from '../../test/matchFixtures';
import { createTournament, drawOrder, tournamentReducer } from '../../domain/tournament';
import { GroupStageHub } from './GroupStageHub';

describe('GroupStageHub', () => {
  it('mostra entrambi i gironi, le sei giornate e rende immediata la partita dell’utente', () => {
    const teams = tournamentTeams();
    let tournament = createTournament({ teams, seasonId: '2015-16', seed: 19, format: 'groups' });
    tournament = tournamentReducer(tournament, { type: 'DRAW', order: drawOrder(tournament, createRng(5)) });
    const onPlay = vi.fn();
    render(<GroupStageHub tournament={tournament} onPlay={onPlay} onSummary={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Girone A' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Girone B' })).toBeInTheDocument();
    expect(screen.getByText('Giornata 1 · Andata')).toBeInTheDocument();
    expect(screen.getByText('Giornata 6 · Ritorno')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Scegli la formazione e gioca/ }));
    expect(onPlay).toHaveBeenCalledOnce();
    expect(onPlay).toHaveBeenCalledWith(expect.stringMatching(/^GA-G1-/));
  });
});
