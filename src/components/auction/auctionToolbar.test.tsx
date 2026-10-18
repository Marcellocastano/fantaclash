import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Player, Team } from '../../types';
import { LotStage } from './LotStage';
import { AuctionToolbar } from './AuctionToolbar';

const PLAYER: Player = {
  id: 'p1',
  name: 'ZAMBROTTA Luca',
  role: 'D',
  team: 'Juventus',
  baseValue: 47,
  avgRating: 7.0,
  goalProbability: 0.2,
  assistProbability: 0.2,
  yellowCardProbability: 0.1,
  redCardProbability: 0.01,
  reliability: 0.9,
};

const TEAM: Team = {
  id: 't1',
  name: 'La mia squadra',
  isUserTeam: true,
  credits: 90,
  initialCredits: 100,
  roster: [],
  botConfig: null,
};

const lotProps = {
  player: PLAYER,
  currentBid: 3,
  bidderId: null as string | null,
  bids: [],
  teams: [TEAM],
  userTeam: TEAM as Team | undefined,
  timeRemaining: 3000,
  active: true,
  canBid: true,
  userMaxBid: 50,
  outbid: false,
  outbidKey: 0,
  autoAdvance: false,
  allowSimulation: true,
  currentRole: 'D' as const,
  canSkipLot: true,
  canSkipRole: false,
  onBid: () => {},
  onNext: () => {},
  onSkipLot: () => {},
  onSkipRole: () => {},
};

const toolbarProps = {
  currentRole: 'D' as const,
  canSimulateRole: true,
  showRoleSkip: true,
  onSimulateRole: () => {},
  onSimulateAll: () => {},
  autoAdvance: true,
  onAutoAdvanceChange: () => {},
};

describe('LotStage: salta il giocatore', () => {
  it('mostra "Salta questo giocatore" e lo invoca al click', () => {
    const onSkipLot = vi.fn();
    render(<LotStage {...lotProps} onSkipLot={onSkipLot} />);
    const btn = screen.getByRole('button', { name: /Salta questo giocatore/ });
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    expect(onSkipLot).toHaveBeenCalledTimes(1);
  });

  it('disabilitato quando canSkipLot è false', () => {
    const onSkipLot = vi.fn();
    render(<LotStage {...lotProps} canSkipLot={false} onSkipLot={onSkipLot} />);
    const btn = screen.getByRole('button', { name: /Salta questo giocatore/ });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onSkipLot).not.toHaveBeenCalled();
  });

  it('non c\'è in stanza (allowSimulation false)', () => {
    render(<LotStage {...lotProps} allowSimulation={false} />);
    expect(screen.queryByRole('button', { name: /Salta questo giocatore/ })).toBeNull();
  });

  it('reparto completato: "Salta il reparto" primario sotto il testo', () => {
    const onSkipRole = vi.fn();
    render(<LotStage {...lotProps} canBid={false} canSkipRole={true} onSkipRole={onSkipRole} />);
    const btn = screen.getByRole('button', { name: /Salta il reparto dei difensori/ });
    fireEvent.click(btn);
    expect(onSkipRole).toHaveBeenCalledTimes(1);
  });
});

describe('AuctionToolbar', () => {
  it('"Completa l\'asta" chiede conferma: solo il conferma chiama onSimulateAll', () => {
    const onSimulateAll = vi.fn();
    render(<AuctionToolbar {...toolbarProps} onSimulateAll={onSimulateAll} />);

    fireEvent.click(screen.getByRole('button', { name: /Completa l.asta/ }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onSimulateAll).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Completa' }));
    expect(onSimulateAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('annulla non simula nulla', () => {
    const onSimulateAll = vi.fn();
    render(<AuctionToolbar {...toolbarProps} onSimulateAll={onSimulateAll} />);
    fireEvent.click(screen.getByRole('button', { name: /Completa l.asta/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(onSimulateAll).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('"Salta il reparto" solo con canSimulateRole && showRoleSkip', () => {
    const { rerender } = render(<AuctionToolbar {...toolbarProps} />);
    expect(screen.getByRole('button', { name: /Salta il reparto dei difensori/ })).toBeInTheDocument();

    rerender(<AuctionToolbar {...toolbarProps} showRoleSkip={false} />);
    expect(screen.queryByRole('button', { name: /Salta il reparto/ })).toBeNull();

    rerender(<AuctionToolbar {...toolbarProps} canSimulateRole={false} />);
    expect(screen.queryByRole('button', { name: /Salta il reparto/ })).toBeNull();
  });

  it('l\'interruttore Auto è presente come switch', () => {
    render(<AuctionToolbar {...toolbarProps} autoAdvance={false} />);
    const sw = screen.getByRole('switch', { name: 'Avanzamento automatico' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
  });
});
