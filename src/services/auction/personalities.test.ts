import { describe, it, expect } from 'vitest';
import {
  ARCHETYPE_PROFILES,
  FOCUS_ROLE_WEIGHT,
  assignArchetypes,
  pickPupilli,
  randomRolePreferences,
} from './personalities';
import { getBotLimit, getStarFactor } from './botValuation';
import { buildMarketSnapshot } from './market';
import { createRng } from './rng';
import { buildRoster, createTestBotConfig, createTestPlayer, createTestTeam } from '../../test/testUtils';
import { BotArchetype, Player, Team } from '../../types';

const ALL: BotArchetype[] = [
  'aggressivo',
  'parsimonioso',
  'stratega',
  'cacciatore',
  'equilibrato',
];

function ctx(teams: Team[], pool: Player[]) {
  return { teams, market: buildMarketSnapshot(teams, pool) };
}

describe('personalities', () => {
  it('assignArchetypes(7) contiene tutti e 5 gli archetipi', () => {
    const result = assignArchetypes(7, createRng(42));
    expect(result).toHaveLength(7);
    for (const a of ALL) {
      expect(result).toContain(a);
    }
  });

  it('assignArchetypes è deterministico a parità di seme', () => {
    expect(assignArchetypes(7, createRng(7))).toEqual(assignArchetypes(7, createRng(7)));
    expect(assignArchetypes(7, createRng(7))).not.toEqual(
      assignArchetypes(7, createRng(8))
    );
  });

  it('pickPupilli: 2-3 id distinti, il primo nel top 10% del pool', () => {
    const pool = Array.from({ length: 100 }, (_, i) =>
      createTestPlayer({ id: `p-${i}`, role: 'C', baseValue: 100 - i })
    );
    const top10 = new Set(
      [...pool]
        .sort((a, b) => b.baseValue - a.baseValue || a.id.localeCompare(b.id))
        .slice(0, 10)
        .map(p => p.id)
    );
    for (let s = 0; s < 50; s++) {
      const pupilli = pickPupilli(pool, createRng(s));
      expect(pupilli.length).toBeGreaterThanOrEqual(2);
      expect(pupilli.length).toBeLessThanOrEqual(3);
      expect(new Set(pupilli).size).toBe(pupilli.length);
      expect(top10.has(pupilli[0])).toBe(true);
    }
  });

  it('a parità di stato e senza lotSeed: aggressivo > equilibrato > parsimonioso su un top player', () => {
    const pool = [
      createTestPlayer({ id: 'star', role: 'A', baseValue: 40 }),
      ...Array.from({ length: 20 }, (_, i) =>
        createTestPlayer({ id: `m-${i}`, role: 'A' as const, baseValue: 15 })
      ),
    ];
    const limits = (archetype: BotArchetype) => {
      const bot = createTestTeam({
        id: 'bot',
        credits: 500,
        botConfig: createTestBotConfig('difficile', archetype),
      });
      const rivals = Array.from({ length: 7 }, (_, i) =>
        createTestTeam({ id: `r-${i}`, credits: 500 })
      );
      return getBotLimit(bot, pool[0], ctx([bot, ...rivals], pool));
    };
    expect(limits('aggressivo')).toBeGreaterThan(limits('equilibrato'));
    expect(limits('equilibrato')).toBeGreaterThan(limits('parsimonioso'));
  });

  it('il pupillo alza il limite del cacciatore e rispetta pupilloMaxShare', () => {
    // Mercato con alta inflazione: il limite è vincolato dai cap di budget,
    // così l'effetto di pupilloMaxShare (0.75 vs 0.60) emerge
    const pool = [
      createTestPlayer({ id: 'star', role: 'A', baseValue: 100 }),
      ...Array.from({ length: 20 }, (_, i) =>
        createTestPlayer({ id: `m-${i}`, role: 'A' as const, baseValue: 20 })
      ),
    ];
    const rivals = Array.from({ length: 7 }, (_, i) =>
      createTestTeam({
        id: `w-${i}`,
        credits: 300,
        initialCredits: 300,
        roster: buildRoster({ P: 1, D: 2, C: 3 }), // mancano 2 A
      })
    );
    const plain = createTestTeam({
      id: 'hunter',
      credits: 300,
      botConfig: createTestBotConfig('normale', 'cacciatore'),
    });
    const withPupillo = createTestTeam({
      id: 'hunter',
      credits: 300,
      botConfig: createTestBotConfig('normale', 'cacciatore', ['star']),
    });
    const c = ctx([plain, ...rivals], pool);

    const limitPupillo = getBotLimit(withPupillo, pool[0], c, 1);
    const limitPlain = getBotLimit(plain, pool[0], c, 1);

    expect(limitPupillo).toBeGreaterThan(limitPlain);
    // Soft cap pupillo: 1 + pupilloMaxShare × (crediti − slot) = 220
    const discretionary = 300 - 8;
    expect(limitPupillo).toBe(
      Math.floor(1 + ARCHETYPE_PROFILES.cacciatore.pupilloMaxShare * discretionary)
    );
    expect(limitPlain).toBe(
      Math.floor(1 + ARCHETYPE_PROFILES.cacciatore.maxShareOfBudget * discretionary)
    );
  });

  it('starAffinity: aggressivo premia i top, parsimonioso i medi', () => {
    const top = createTestPlayer({ id: 'top', role: 'A', baseValue: 40 });
    const mid = createTestPlayer({ id: 'mid', role: 'A', baseValue: 15 });
    const pool = [top, mid];
    const market = buildMarketSnapshot([createTestTeam()], pool);

    const agg = createTestBotConfig('normale', 'aggressivo');
    const par = createTestBotConfig('normale', 'parsimonioso');

    expect(getStarFactor(agg, top, market)).toBeGreaterThan(getStarFactor(par, top, market));
    expect(getStarFactor(par, mid, market)).toBeGreaterThan(getStarFactor(agg, mid, market));
    // Sul top player: 1 + starAffinity (rel = 1)
    expect(getStarFactor(agg, top, market)).toBeCloseTo(1.15, 5);
    expect(getStarFactor(par, top, market)).toBeCloseTo(0.85, 5);
  });

  it('tutti gli archetipi hanno un profilo con label', () => {
    for (const a of ALL) {
      expect(ARCHETYPE_PROFILES[a].label.length).toBeGreaterThan(0);
    }
  });

  describe('randomRolePreferences', () => {
    it('al più un reparto sopra 1.12 (il focus), il resto in [0.88, 1.12]', () => {
      const rng = createRng(7);
      for (let i = 0; i < 500; i++) {
        const prefs = randomRolePreferences(rng);
        const roles = ['P', 'D', 'C', 'A'] as const;
        const focused = roles.filter(r => prefs[r] > 1.12);
        expect(focused.length).toBeLessThanOrEqual(1);
        for (const r of roles) {
          expect(prefs[r]).toBeGreaterThanOrEqual(0.88);
          expect(prefs[r]).toBeLessThanOrEqual(1.12 * FOCUS_ROLE_WEIGHT + 1e-9);
        }
      }
    });

    it('il reparto focus è moltiplicato per FOCUS_ROLE_WEIGHT', () => {
      // Su tanti campioni almeno un focus deve comparire per ogni reparto
      // possibile e il valore focus deve superare 1.12
      const rng = createRng(99);
      const seen = new Set<string>();
      for (let i = 0; i < 2000; i++) {
        const prefs = randomRolePreferences(rng);
        for (const r of ['P', 'D', 'C', 'A'] as const) {
          if (prefs[r] > 1.12) {
            seen.add(r);
            // Base in [0.88,1.12] x 1.6 -> [1.408, 1.792]
            expect(prefs[r]).toBeGreaterThanOrEqual(0.88 * FOCUS_ROLE_WEIGHT);
            expect(prefs[r]).toBeLessThanOrEqual(1.12 * FOCUS_ROLE_WEIGHT + 1e-9);
          }
        }
      }
      expect(seen.size).toBe(4);
    });

    it('deterministico a parità di seme', () => {
      const a = randomRolePreferences(createRng(5));
      const b = randomRolePreferences(createRng(5));
      expect(a).toEqual(b);
    });
  });
});
