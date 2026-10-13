import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createTestPlayer, createTestTeam } from '../../test/testUtils';
import { isValidLineup } from '../../domain/teams/formations';
import { LineupScreen } from './LineupScreen';

function roster() {
  return [
    createTestPlayer({ id: 'p', role: 'P', name: 'Portiere' }),
    ...Array.from({ length: 4 }, (_, i) => createTestPlayer({ id: `d${i}`, role: 'D', name: `Difensore ${i}` })),
    ...Array.from({ length: 4 }, (_, i) => createTestPlayer({ id: `c${i}`, role: 'C', name: `Centrocampista ${i}` })),
    ...Array.from({ length: 3 }, (_, i) => createTestPlayer({ id: `a${i}`, role: 'A', name: `Attaccante ${i}` })),
  ];
}

describe('LineupScreen', () => {
  it('seleziona un modulo, mostra le riserve e conferma una formazione valida', () => {
    const players = roster();
    const team = createTestTeam({ id: 'user', name: 'Squadra', roster: players.map(player => ({ player, purchasePrice: 1 })) });
    const onConfirm = vi.fn();
    const initialLineup = { formation: '2-3-2' as const, starters: ['p', 'd0', 'd1', 'c0', 'c1', 'c2', 'a0', 'a1'] };
    render(<LineupScreen team={team} initialLineup={initialLineup} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('radio', { name: /2-4-1/ }));
    expect(screen.getByLabelText('Formazione sul campo')).toHaveTextContent('2-4-1');
    expect(screen.getByText('Riserve · 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Conferma formazione/ }));
    expect(onConfirm).toHaveBeenCalledOnce();
    const lineup = onConfirm.mock.calls[0][0];
    expect(lineup.formation).toBe('2-4-1');
    expect(lineup.starters).toEqual(expect.arrayContaining(['p', 'd0', 'd1', 'c0', 'c1', 'c2']));
    expect(isValidLineup(team.roster, lineup)).toBe(true);
  });
});
