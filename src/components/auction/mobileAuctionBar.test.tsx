import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Player, Team } from '../../types';
import { MobileAuctionBar } from './MobileAuctionBar';

const mkPlayer = (id: string, role: Player['role']): Player => ({
  id,
  name: 'TEST Player',
  role,
  team: 'Club',
  baseValue: 10,
  avgRating: 6,
  goalProbability: 0.1,
  assistProbability: 0.1,
  yellowCardProbability: 0.1,
  redCardProbability: 0.01,
  reliability: 0.8,
});

const TEAM: Team = {
  id: 'u1',
  name: 'La mia squadra',
  isUserTeam: true,
  credits: 87,
  initialCredits: 100,
  roster: [
    { player: mkPlayer('p1', 'D'), purchasePrice: 12, isStarter: true, formationPosition: 0 },
    { player: mkPlayer('p2', 'P'), purchasePrice: 8, isStarter: true, formationPosition: 0 },
  ],
  botConfig: null,
};

describe('MobileAuctionBar', () => {
  it('mostra crediti, offerta max e riempimento del reparto', () => {
    const { container } = render(<MobileAuctionBar team={TEAM} role="D" maxBid={80} leading={false} />);
    expect(screen.getByText('Crediti')).toBeInTheDocument();
    expect(screen.getByText('87')).toBeInTheDocument();
    expect(screen.getByText('Offerta max')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    // 1 difensore su 2 richiesti
    expect(screen.getByText('Difensori')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(container.firstElementChild?.className).toContain('bg-canvas');
  });

  it('in testa nel rilancio: la barra si tinge di giallo', () => {
    const { container } = render(<MobileAuctionBar team={TEAM} role="P" maxBid={80} leading />);
    expect(container.firstElementChild?.className).toContain('bg-highlight');
  });
});
