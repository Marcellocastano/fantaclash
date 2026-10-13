import { describe, it, expect } from 'vitest';
import {
  ARCHETYPE_PROFILES,
  FORMATION_PREFERENCES,
  assignArchetypes,
  pickPupilli,
  preferredFormationFor,
  randomRolePreferences,
} from './personalities';
import { getBotLimit, getStarFactor } from './botValuation';
import { buildMarketSnapshot } from './market';
import { createRng } from './rng';
import { createTestBotConfig, createTestPlayer, createTestTeam } from '../../test/testUtils';
import { BotArchetype, Player, Team } from '../../types';

const ALL: BotArchetype[] = ['aggressivo', 'parsimonioso', 'stratega', 'cacciatore', 'equilibrato'];

function ctx(teams: Team[], pool: Player[]) {
  return { teams, market: buildMarketSnapshot(teams, pool), pool };
}

describe('personalities', () => {
  it('assignArchetypes(7) contiene tutti e 5 gli archetipi', () => {
    const result = assignArchetypes(7, createRng(42));
    expect(result).toHaveLength(7);
    for (const archetype of ALL) expect(result).toContain(archetype);
  });

  it('assignArchetypes è deterministico a parità di seme', () => {
    expect(assignArchetypes(7, createRng(7))).toEqual(assignArchetypes(7, createRng(7)));
    expect(assignArchetypes(7, createRng(7))).not.toEqual(assignArchetypes(7, createRng(8)));
  });

  it('profili completi e pupilli premiati nel limite del bot', () => {
    for (const archetype of ALL) {
      const profile = ARCHETYPE_PROFILES[archetype];
      expect(profile.label.length).toBeGreaterThan(0);
      expect(profile.valueMultiplier).toBeGreaterThan(0);
    }
    const pool = [createTestPlayer({ id: 'pupillo', role: 'A', baseValue: 20 })];
    const bot = createTestTeam({
      credits: 100,
      botConfig: { ...createTestBotConfig('normale', 'cacciatore', ['pupillo']), pupilli: ['pupillo'] },
    });
    const rivals = Array.from({ length: 2 }, (_, i) => createTestTeam({ id: `r${i}`, credits: 100 }));
    const context = ctx([bot, ...rivals], pool);
    expect(getBotLimit(bot, pool[0], context)).toBeGreaterThanOrEqual(1);
    expect(getStarFactor(bot.botConfig!, pool[0], context.market)).toBeGreaterThan(0);
  });

  it('preferenze di ruolo sono solo leggere e non creano un reparto focus rigido', () => {
    const rng = createRng(7);
    for (let i = 0; i < 500; i++) {
      const prefs = randomRolePreferences(rng);
      for (const role of ['P', 'D', 'C', 'A'] as const) {
        expect(prefs[role]).toBeGreaterThanOrEqual(0.88);
        expect(prefs[role]).toBeLessThanOrEqual(1.12);
      }
    }
  });

  it('archetipi con strategie differenti hanno una filosofia tattica coerente', () => {
    for (const archetype of ALL) {
      const rng = createRng(99);
      const selected = Array.from({ length: 600 }, () => preferredFormationFor(archetype, rng));
      const prefs = FORMATION_PREFERENCES[archetype];
      for (const formation of Object.keys(prefs) as (keyof typeof prefs)[]) {
        const ratio = selected.filter(value => value === formation).length / selected.length;
        expect(ratio).toBeGreaterThan((prefs[formation] ?? 0) - 0.08);
        expect(ratio).toBeLessThan((prefs[formation] ?? 0) + 0.08);
      }
    }
  });

  it('pupilli sono distinti, limitati e scelti dal pool', () => {
    const pool = Array.from({ length: 30 }, (_, i) => createTestPlayer({ id: `p${i}`, role: 'A', baseValue: 30 - i }));
    const picked = pickPupilli(pool, createRng(1));
    expect(picked.length).toBeGreaterThanOrEqual(2);
    expect(picked.length).toBeLessThanOrEqual(3);
    expect(new Set(picked).size).toBe(picked.length);
    expect(picked.every(id => pool.some(player => player.id === id))).toBe(true);
  });

  it('deterministico a parità di seme', () => {
    expect(randomRolePreferences(createRng(5))).toEqual(randomRolePreferences(createRng(5)));
  });
});
