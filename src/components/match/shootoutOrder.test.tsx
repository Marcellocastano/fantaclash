import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LineupPlayer } from '../../domain/match';
import { ShootoutOrderPanel } from './ShootoutOrderPanel';

const player = (id: string, name: string): LineupPlayer => ({
  playerId: id,
  name,
  role: 'C',
  club: 'Club',
  overall: 82,
  form: 1,
});

describe('ordine dei rigoristi', () => {
  it('le frecce riordinano e la conferma restituisce il nuovo ordine', () => {
    const onConfirm = vi.fn();
    render(<ShootoutOrderPanel players={[player('a', 'ROSSI Mario'), player('b', 'BIANCHI Luca'), player('c', 'VERDI Gino')]} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sposta Verdi in alto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sposta Rossi in basso' }));
    fireEvent.click(screen.getByRole('button', { name: "Conferma l'ordine" }));
    expect(onConfirm).toHaveBeenCalledWith(['c', 'a', 'b']);
  });
});
