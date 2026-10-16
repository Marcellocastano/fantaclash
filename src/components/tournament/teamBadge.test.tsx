import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { TeamBadge } from './TeamBadge';
import { kitOf } from '../../domain/teamKits';

describe('TeamBadge', () => {
  it('rende i colori sociali come stili inline: primario, banda secondaria, sigla in "on"', () => {
    const { container } = render(
      <TeamBadge team={{ id: 't1', name: 'Torino Granata', isUserTeam: true, kit: 'granata' }} />
    );
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.style.backgroundColor).toBe('rgb(122, 31, 43)'); // #7A1F2B
    expect(badge.style.color).toBe('rgb(255, 255, 255)');
    const band = badge.querySelector('span') as HTMLElement;
    expect(band.style.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(badge.textContent).toContain('TG');
  });

  it('senza kit usa il fallback deterministico di kitOf', () => {
    const team = { id: 't2', name: 'Squadra Beta', isUserTeam: false };
    const kit = kitOf(team);
    const { container } = render(<TeamBadge team={team} />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.style.backgroundColor).toBeTruthy();
    expect(badge.style.backgroundColor).toBe(
      `rgb(${parseInt(kit.primary.slice(1, 3), 16)}, ${parseInt(kit.primary.slice(3, 5), 16)}, ${parseInt(kit.primary.slice(5, 7), 16)})`
    );
  });

  it('squadra assente -> segnaposto tratteggiato', () => {
    const { container } = render(<TeamBadge team={undefined} />);
    expect(container.firstElementChild?.className).toContain('border-dashed');
  });
});
