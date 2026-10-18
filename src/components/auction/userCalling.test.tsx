import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Team } from '../../types';
import { UserCalling } from './UserCalling';

const TEAM: Team = {
  id: 'u1',
  name: 'La mia squadra',
  isUserTeam: true,
  credits: 87,
  initialCredits: 100,
  roster: [],
  botConfig: null,
};

describe('UserCalling', () => {
  it('mostra la squadra, il reparto e i tre numeri utili', () => {
    render(<UserCalling team={TEAM} role="P" maxBid={80} callSeconds={null} />);

    expect(screen.getByText('La mia squadra')).toBeInTheDocument();
    expect(screen.getByText('La tua chiamata')).toBeInTheDocument();
    expect(screen.getByText('portiere')).toBeInTheDocument();
    // rosa senza portieri -> 1 da prendere; 87 crediti; offerta max 80
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('87')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('Da prendere')).toBeInTheDocument();
    // niente timer fuori dalle stanze
    expect(screen.queryByText('Tempo per chiamare')).toBeNull();
  });

  it('con callSeconds mostra il conto alla rovescia', () => {
    render(<UserCalling team={TEAM} role="P" maxBid={80} callSeconds={12} />);
    expect(screen.getByText('Tempo per chiamare')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});
