import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Player } from '../../types';
import { t } from '../../i18n/translate';
import { playerOverall } from '../../services/auction/teamStrength';
import { TIER_KEY, tierOf } from '../player/tier';
import { PlayerCard } from '../player/PlayerCard';
import { PlayerList } from './PlayerList';
import { isCovered } from '../../services/auction';

// Valori volutamente riconoscibili per controllare che non trapelino
const PLAYER: Player = {
  id: 'p1',
  name: 'ZAMBROTTA Luca',
  role: 'D',
  team: 'Juventus',
  baseValue: 47,
  avgRating: 7.23,
  goalProbability: 0.31,
  assistProbability: 0.42,
  yellowCardProbability: 0.11,
  redCardProbability: 0.02,
  reliability: 0.9,
};

const mk = (id: string, name: string, role: Player['role'] = 'D'): Player => ({
  id,
  name,
  role,
  team: 'Club Test',
  baseValue: 30,
  avgRating: 6.5,
  goalProbability: 0.2,
  assistProbability: 0.2,
  yellowCardProbability: 0.1,
  redCardProbability: 0.01,
  reliability: 0.8,
});

describe('PlayerCard coperta (difficile)', () => {
  it('mostra il ruolo al posto dell\'overall, nasconde overall/valore/statistiche/fascia', () => {
    const { container } = render(<PlayerCard player={PLAYER} size="lg" covered />);

    expect(screen.getByText('D')).toBeInTheDocument();

    const text = container.textContent ?? '';
    const ovr = playerOverall(PLAYER);
    expect(text).not.toContain(String(ovr));
    expect(text).not.toContain('47'); // baseValue
    expect(text).not.toContain('7.2'); // MV
    expect(text).not.toContain('31%'); // gol
    expect(text).not.toContain('42%'); // assist
    expect(text).not.toContain(t(TIER_KEY[tierOf(ovr)])); // etichetta di fascia

    // Nome, club e ruolo restano visibili
    expect(text).toContain('Zambrotta');
    expect(text).toContain('Juventus');
    expect(text).toContain('D');
  });

  it('senza covered mostra overall e statistiche come prima', () => {
    const { container } = render(<PlayerCard player={PLAYER} size="lg" />);
    const text = container.textContent ?? '';
    expect(text).toContain(String(playerOverall(PLAYER)));
    expect(text).toContain('7.2');
    expect(text).not.toContain('Statistiche coperte');
  });
});

describe('PlayerList coperta (difficile)', () => {
  const available = [mk('a', 'ROSSI Marco'), mk('b', 'ALESSI Luca'), mk('c', 'VERDI Paolo')];

  it('nasconde il selettore di ordinamento e il valore, ordina per cognome', () => {
    render(
      <PlayerList
        available={available}
        sold={[]}
        currentRole="D"
        isSelectable={false}
        onSelectPlayer={() => {}}
        covered
      />
    );

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByText('valore')).toBeNull();
    expect(screen.queryByText('?')).toBeNull();

    const items = screen.getAllByRole('listitem').map(li => li.textContent);
    expect(items).toEqual([
      expect.stringContaining('Alessi'),
      expect.stringContaining('Rossi'),
      expect.stringContaining('Verdi'),
    ]);
  });
});

describe('isCovered', () => {
  it('difficile + asta in corso -> coperte; complete o normale -> scoperte', () => {
    expect(isCovered('difficile', 'bidding')).toBe(true);
    expect(isCovered('difficile', 'calling')).toBe(true);
    expect(isCovered('difficile', undefined)).toBe(true);
    expect(isCovered('difficile', 'complete')).toBe(false);
    expect(isCovered('normale', 'bidding')).toBe(false);
    expect(isCovered(undefined, 'bidding')).toBe(false);
  });
});
