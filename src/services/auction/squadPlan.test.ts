import { describe, expect, it } from 'vitest';
import { createTestBotConfig, createTestPlayer, createTestTeam } from '../../test/testUtils';
import { buildMarketSnapshot } from './market';
import { getSquadPlan } from './squadPlan';

const pool = [
  createTestPlayer({ id: 'p', role: 'P', overall: 84 }),
  ...Array.from({ length: 8 }, (_, i) => createTestPlayer({ id: `d${i}`, role: 'D', overall: 80 + i })),
  ...Array.from({ length: 8 }, (_, i) => createTestPlayer({ id: `c${i}`, role: 'C', overall: 80 + i })),
  ...Array.from({ length: 6 }, (_, i) => createTestPlayer({ id: `a${i}`, role: 'A', overall: 80 + i })),
];

describe('piano tattico della rosa bot', () => {
  it('assegna priorità agli slot titolari del modulo scelto e pianifica riserve', () => {
    const bot = createTestTeam({
      id: 'bot',
      credits: 250,
      botConfig: { ...createTestBotConfig(), preferredFormation: '2-2-3' },
    });
    const context = { teams: [bot], pool, market: buildMarketSnapshot([bot], pool) };
    const plan = getSquadPlan(bot, context);
    expect(plan.formation).toBe('2-2-3');
    expect(plan.starterSlots).toEqual({ P: 1, D: 2, C: 2, A: 3 });
    expect(Object.values(plan.starterNeed).reduce((sum, count) => sum + count, 0)).toBe(8);
    expect(plan.benchNeed).toBe(4);
    expect(plan.expectedSpend).toBeGreaterThan(0);
    expect(Object.values(plan.budgetByRole).reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(250);
  });

  it('adatta i titolari posseduti e conserva il budget minimo per i posti rimanenti', () => {
    const bot = createTestTeam({
      id: 'bot-owned',
      credits: 180,
      roster: [pool[0], pool[1], pool[2], pool[9], pool[10]].map(player => ({ player, purchasePrice: 10 })),
      botConfig: { ...createTestBotConfig(), preferredFormation: '3-3-1' },
    });
    const context = { teams: [bot], pool: pool.slice(5), market: buildMarketSnapshot([bot], pool.slice(5)) };
    const plan = getSquadPlan(bot, context);
    expect(Object.values(plan.ownedStarters).reduce((sum, count) => sum + count, 0)).toBe(5);
    expect(Object.values(plan.starterNeed).reduce((sum, count) => sum + count, 0)).toBe(3);
    expect(plan.benchNeed).toBe(4);
  });
});
