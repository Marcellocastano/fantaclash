import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Landing } from './Landing';
import { BOT_TEAM_NAMES, MAX_TEAM_NAME_LENGTH, randomTeamName } from '../mock/teamNames';

vi.mock('./ThemeToggle', () => ({ ThemeToggle: () => null }));

const SEASONS = ['2013-14', '2014-15', '2015-16'].map(season => ({
  season,
  label: `Serie A ${season}`,
  playerCount: 96,
}));

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => SEASONS })));
});

describe('landing', () => {
  it('generatore di nomi: solo nomi della lista validi per il form, diverso dal corrente', () => {
    for (let i = 0; i < 50; i++) {
      const name = randomTeamName('SBRAGA');
      expect(BOT_TEAM_NAMES).toContain(name);
      expect(name.length).toBeLessThanOrEqual(MAX_TEAM_NAME_LENGTH);
      expect(name).not.toBe('SBRAGA');
    }
  });

  it('nome precompilato, "Genera" lo cambia; annata più recente di default e frecce', async () => {
    const onSubmit = vi.fn();
    render(<Landing onSubmit={onSubmit} />);
    const input = screen.getByLabelText('La tua squadra') as HTMLInputElement;
    const first = input.value;
    expect(BOT_TEAM_NAMES).toContain(first);
    fireEvent.click(screen.getByTitle('Genera un nome'));
    expect(input.value).not.toBe(first);

    await waitFor(() => expect(screen.getByRole('group', { name: 'Annata' })).toHaveTextContent('2015-16'));
    fireEvent.click(screen.getByLabelText('Annata precedente'));
    expect(screen.getByRole('group', { name: 'Annata' })).toHaveTextContent('2014-15');
    fireEvent.click(screen.getByRole('radio', { name: 'Difficile' }));

    fireEvent.click(screen.getByRole('button', { name: /Gioca/ }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({ userTeamName: input.value, difficulty: 'difficile', season: '2014-15' });
  });

  it('mostra regole e footer con il bottone di supporto', () => {
    render(<Landing onSubmit={vi.fn()} />);
    expect(screen.getByText('Le regole in breve')).toBeInTheDocument();
    expect(screen.getByText('Supporta FantaClash')).toBeInTheDocument();
  });
});
