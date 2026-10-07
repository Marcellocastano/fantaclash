import { describe, it, expect } from 'vitest';
import { buildMarketSnapshot, getSurplusValue, getFairPrice, getExpectedSpend } from './market';
import { ROLE_ORDER, buildAuctionPool, getTotalRemainingSlots } from './rules';
import { PLAYERS_DATABASE } from '../../mock/players';
import { createRng } from './rng';
import { buildRoster, createTestPlayer, createTestTeam } from '../../test/testUtils';
import { generateAllTeams } from '../teamGenerator';
import { Player, Team } from '../../types';

/** Fixture piccola calcolabile a mano: 2 squadre a cui mancano 1P e 1A */
function smallFixture() {
  const roster = () => buildRoster({ D: 2, C: 3, A: 1 });
  const teams = [
    createTestTeam({ id: 't1', credits: 100, roster: roster() }),
    createTestTeam({ id: 't2', credits: 50, roster: roster() }),
  ];
  const pool: Player[] = [
    createTestPlayer({ id: 'p1', role: 'P', baseValue: 30 }),
    createTestPlayer({ id: 'p2', role: 'P', baseValue: 20 }),
    createTestPlayer({ id: 'p3', role: 'P', baseValue: 10 }),
    createTestPlayer({ id: 'a1', role: 'A', baseValue: 40 }),
    createTestPlayer({ id: 'a2', role: 'A', baseValue: 10 }),
    createTestPlayer({ id: 'a3', role: 'A', baseValue: 5 }),
  ];
  return { teams, pool };
}

describe('market', () => {
  it('snapshot calcolato a mano su fixture piccola', () => {
    const { teams, pool } = smallFixture();
    const market = buildMarketSnapshot(teams, pool);

    // Ogni squadra ha bisogno di 1P e 1A
    expect(market.demand).toEqual({ P: 2, D: 0, C: 0, A: 2 });
    // Rimpiazzo = (demand+1)-esimo migliore: P -> 10, A -> 5
    expect(market.replacementValue.P).toBe(10);
    expect(market.replacementValue.A).toBe(5);
    expect(market.replacementValue.D).toBe(0);
    // 98 + 48
    expect(market.discretionaryMoney).toBe(146);
    // P: (30-10)+(20-10)=30 ; A: (40-5)+(10-5)=40
    expect(market.totalSurplusValue).toBe(70);
    expect(market.inflation).toBeCloseTo(146 / 70, 10);

    const inflation = 146 / 70;
    expect(getFairPrice(pool[0], market)).toBe(Math.round(1 + inflation * 20)); // P 30 -> 43
    expect(getFairPrice(pool[3], market)).toBe(Math.round(1 + inflation * 35)); // A 40 -> 74
    expect(getFairPrice(pool[4], market)).toBe(Math.round(1 + inflation * 5));  // A 10 -> 11
  });

  it('prezzo equo monotono nel baseValue', () => {
    const { teams, pool } = smallFixture();
    const market = buildMarketSnapshot(teams, pool);
    const ps = pool.filter(p => p.role === 'P');
    expect(getFairPrice(ps[0], market)).toBeGreaterThan(getFairPrice(ps[1], market));
    expect(getFairPrice(ps[1], market)).toBeGreaterThan(getFairPrice(ps[2], market));
  });

  it('giocatore sotto il valore di rimpiazzo vale 1', () => {
    const { teams, pool } = smallFixture();
    const market = buildMarketSnapshot(teams, pool);
    const weak = createTestPlayer({ id: 'weak', role: 'P', baseValue: 5 });
    expect(getSurplusValue(weak, market)).toBe(0);
    expect(getFairPrice(weak, market)).toBe(1);
    void pool;
  });

  it('più crediti in lega -> inflazione più alta', () => {
    const { teams, pool } = smallFixture();
    const rich = teams.map((t: Team) => ({ ...t, credits: t.credits + 200 }));
    expect(buildMarketSnapshot(rich, pool).inflation)
      .toBeGreaterThan(buildMarketSnapshot(teams, pool).inflation);
  });

  it('DB reale 8 squadre x 100 con listone: la somma dei fair price copre il denaro discrezionale', () => {
    const pool = buildAuctionPool(PLAYERS_DATABASE);
    const teams = generateAllTeams('User', 'normale', pool, createRng(42));
    const market = buildMarketSnapshot(teams, pool);

    const totalDemand = Object.values(market.demand).reduce((a, b) => a + b, 0);
    let fairSum = 0;
    for (const role of ROLE_ORDER) {
      const top = pool
        .filter(p => p.role === role)
        .sort((a, b) => b.baseValue - a.baseValue)
        .slice(0, market.demand[role]);
      fairSum += top.reduce((sum, p) => sum + getFairPrice(p, market), 0);
    }

    const target = market.discretionaryMoney + totalDemand;
    expect(Math.abs(fairSum - target) / target).toBeLessThanOrEqual(0.05);
    // Sanità: ogni squadra ha 8 slot all\'inizio
    expect(getTotalRemainingSlots(teams[0])).toBe(8);
  });

  describe('getExpectedSpend', () => {
    it('somma slot x inflazione x surplus medio per ruolo', () => {
      const { teams, pool } = smallFixture();
      const market = buildMarketSnapshot(teams, pool);
      const slots = { P: 1, D: 0, C: 2, A: 1 };
      const expected =
        slots.P * market.inflation * market.avgSurplus.P +
        slots.C * market.inflation * market.avgSurplus.C +
        slots.A * market.inflation * market.avgSurplus.A;
      expect(getExpectedSpend(slots, market)).toBeCloseTo(expected, 10);
    });

    it('0 slot o slot negativi -> 0', () => {
      const { teams, pool } = smallFixture();
      const market = buildMarketSnapshot(teams, pool);
      expect(getExpectedSpend({ P: 0, D: 0, C: 0, A: 0 }, market)).toBe(0);
      expect(getExpectedSpend({ P: -1, D: 0, C: 0, A: 0 }, market)).toBe(0);
    });
  });
});
