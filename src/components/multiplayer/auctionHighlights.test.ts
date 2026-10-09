import { describe, it, expect } from 'vitest';
import { createTestPlayer, createTestTeam } from '../../test/testUtils';
import { auctionHighlights } from './auctionHighlights';
import { OwnedPlayer, PlayerRole } from '../../types';

let pos = 0;
const own = (role: PlayerRole, overall: number, price: number, id?: string): OwnedPlayer => ({
  player: createTestPlayer({ id: id ?? `pl-${pos}`, role, overall, name: `X ${id ?? pos}` }),
  purchasePrice: price,
  isStarter: false,
  formationPosition: pos++,
});

describe('auctionHighlights', () => {
  it('colpo dell\'asta: l\'acquisto più caro; parità -> prima squadra', () => {
    const a = createTestTeam({ name: 'Alfa', roster: [own('A', 90, 50)] });
    const b = createTestTeam({ name: 'Beta', roster: [own('A', 91, 50)] });
    const { top } = auctionHighlights([a, b]);
    expect(top!.entry.purchasePrice).toBe(50);
    expect(top!.team.name).toBe('Alfa'); // parità: la prima in ordine
  });

  it('l\'affare: miglior overall tra gli acquisti <= 3 Cr', () => {
    const a = createTestTeam({ name: 'Alfa', roster: [own('D', 80, 1), own('C', 85, 3)] });
    const b = createTestTeam({ name: 'Beta', roster: [own('A', 95, 40)] });
    const { bargain } = auctionHighlights([a, b]);
    expect(playerOverallOf(bargain!)).toBe(85);
  });

  it('l\'affare senza acquisti a <= 3 Cr: miglior rapporto overall/prezzo', () => {
    const a = createTestTeam({ name: 'Alfa', roster: [own('D', 80, 10)] }); // 8.0
    const b = createTestTeam({ name: 'Beta', roster: [own('A', 95, 20)] }); // 4.75
    const { bargain } = auctionHighlights([a, b]);
    expect(bargain!.team.name).toBe('Alfa');
  });

  it('rosa più forte: media overall più alta', () => {
    const a = createTestTeam({ name: 'Alfa', roster: [own('P', 80, 1), own('D', 90, 1)] });
    const b = createTestTeam({ name: 'Beta', roster: [own('P', 90, 1), own('D', 90, 1)] });
    const { strongest } = auctionHighlights([a, b]);
    expect(strongest!.team.name).toBe('Beta');
    expect(strongest!.strength).toBeCloseTo(90);
  });

  it('rose vuote: nessun titolo', () => {
    const { top, bargain, strongest } = auctionHighlights([createTestTeam()]);
    expect(top).toBeNull();
    expect(bargain).toBeNull();
    expect(strongest).toBeNull();
  });
});

function playerOverallOf(p: { entry: OwnedPlayer }) {
  return p.entry.player.overall;
}
