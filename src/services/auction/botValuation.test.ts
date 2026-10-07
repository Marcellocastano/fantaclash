import { describe, it, expect } from 'vitest';
import {
  DIFFICULTY_PROFILES,
  PUPILLO_PACING_FACTOR,
  getBotLimit,
  estimateRivalLimit,
  getWealthRatio,
  rivalLimitFactors,
  applyRivalLimitFactors,
} from './botValuation';
import { ARCHETYPE_PROFILES, MAX_SOFT_CAP_SHARE } from './personalities';
import { buildMarketSnapshot, getExpectedSpend } from './market';
import { getMaxBid, getRemainingSlots, buildAuctionPool } from './rules';
import { PLAYERS_DATABASE } from '../../mock/players';
import { buildRoster, createTestBotConfig, createTestPlayer, createTestTeam } from '../../test/testUtils';
import { Player, Team } from '../../types';

function ctx(teams: Team[], pool: Player[]) {
  return { teams, market: buildMarketSnapshot(teams, pool) };
}

describe('botValuation', () => {
  const pool = [
    createTestPlayer({ id: 'star', role: 'A', baseValue: 40 }),
    createTestPlayer({ id: 'mid', role: 'A', baseValue: 15 }),
    createTestPlayer({ id: 'low', role: 'A', baseValue: 5 }),
  ];

  it('i profili: in difficile meno rumore e personalità più smorzata', () => {
    const { normale, difficile } = DIFFICULTY_PROFILES;
    expect(normale.noise).toBeGreaterThan(difficile.noise);
    expect(difficile.personalityWeight).toBeLessThan(normale.personalityWeight);
  });

  it('il limite non supera mai getMaxBid', () => {
    const bot = createTestTeam({ credits: 60, botConfig: createTestBotConfig('normale') });
    const rival = createTestTeam({ credits: 500 });
    const limit = getBotLimit(bot, pool[0], ctx([bot, rival], pool), 1);
    expect(limit).toBeLessThanOrEqual(getMaxBid(bot));
  });

  it('0 se il ruolo è completo o manca botConfig', () => {
    const done = createTestTeam({
      botConfig: createTestBotConfig('normale'),
      roster: buildRoster({ A: 2 }),
    });
    const noConfig = createTestTeam({ botConfig: null });
    const c = ctx([done, noConfig], pool);
    expect(getBotLimit(done, pool[0], c)).toBe(0);
    expect(getBotLimit(noConfig, pool[0], c)).toBe(0);
  });

  it('deterministico: stesso lotSeed -> stesso limite', () => {
    const bot = createTestTeam({ botConfig: createTestBotConfig('normale') });
    const rival = createTestTeam();
    const c = ctx([bot, rival], pool);
    expect(getBotLimit(bot, pool[0], c, 123)).toBe(getBotLimit(bot, pool[0], c, 123));
  });

  it('spread dei limiti su 200 semi: difficile < normale', () => {
    // Giocatore con surplus piccolo: il limite resta sotto il softCap, quindi il rumore emerge
    const target = createTestPlayer({ id: 'a-target', role: 'A', baseValue: 9 });
    const poolMany = [
      ...pool,
      target,
      ...Array.from({ length: 20 }, (_, i) =>
        createTestPlayer({ id: `a-extra-${i}`, role: 'A' as const, baseValue: 8 })
      ),
    ];
    const spread = (difficulty: 'normale' | 'difficile') => {
      const bot = createTestTeam({ botConfig: createTestBotConfig(difficulty) });
      const rivals = Array.from({ length: 7 }, () => createTestTeam());
      const c = ctx([bot, ...rivals], poolMany);
      const limits = Array.from({ length: 200 }, (_, s) =>
        getBotLimit(bot, target, c, s)
      );
      return Math.max(...limits) - Math.min(...limits);
    };
    expect(spread('difficile')).toBeLessThan(spread('normale'));
  });

  it('un bot più ricco ha un limite più alto', () => {
    const poor = createTestTeam({ credits: 100, botConfig: createTestBotConfig('normale') });
    const rich = createTestTeam({ credits: 900, botConfig: createTestBotConfig('normale') });
    const c = ctx([poor, rich], pool);
    const limitPoor = getBotLimit(poor, pool[0], c, 7);
    const limitRich = getBotLimit(rich, pool[0], c, 7);
    expect(limitRich).toBeGreaterThan(limitPoor);
  });

  it('softCap rispettato quando gli slot sono più di uno', () => {
    const bot = createTestTeam({ credits: 500, botConfig: createTestBotConfig('normale') });
    const others = Array.from({ length: 7 }, () => createTestTeam({ credits: 500 }));
    const bigPool = [
      ...pool,
      ...Array.from({ length: 40 }, (_, i) =>
        createTestPlayer({ id: `x${i}`, role: 'A' as const, baseValue: 10 })
      ),
    ];
    // Alta inflazione: avversari ricchissimi
    const whales = others.map(t => ({ ...t, credits: 5000, initialCredits: 5000 }));
    const c = ctx([bot, ...whales], bigPool);
    const limit = getBotLimit(bot, pool[0], c, 1);
    const softCap = 1 + ARCHETYPE_PROFILES.equilibrato.maxShareOfBudget * (bot.credits - 8);
    expect(limit).toBeLessThanOrEqual(Math.floor(softCap));
  });

  it('ultimo slot: può superare il softCap', () => {
    const bot = createTestTeam({
      credits: 400,
      botConfig: createTestBotConfig('difficile'),
      roster: buildRoster({ P: 1, D: 2, C: 3, A: 1 }), // resta 1 slot A
    });
    // Rivale ricco a cui manca solo 1 A: inflazione alta e rivalCap alto
    const whale = createTestTeam({
      credits: 10000,
      initialCredits: 10000,
      roster: buildRoster({ P: 1, D: 2, C: 3, A: 1 }),
    });
    const c = ctx([bot, whale], pool);
    const limit = getBotLimit(bot, pool[0], c, 1);
    // Con un solo slot il softCap è Infinity: il limite può arrivare a getMaxBid
    expect(limit).toBeGreaterThan(1 + 0.55 * (bot.credits - 1));
    expect(limit).toBeLessThanOrEqual(getMaxBid(bot));
  });

  it('estimateRivalLimit: 0 se il ruolo non serve, altrimenti >= 1', () => {
    const t = createTestTeam({ credits: 300 });
    const c = ctx([t], pool);
    expect(estimateRivalLimit(t, pool[0], c)).toBeGreaterThanOrEqual(1);
    const done = createTestTeam({ roster: buildRoster({ A: 2 }) });
    expect(estimateRivalLimit(done, pool[0], ctx([done], pool))).toBe(0);
  });

  it('getWealthRatio: ~1 per squadre uguali', () => {
    const teams = Array.from({ length: 4 }, () => createTestTeam({ credits: 500 }));
    expect(getWealthRatio(teams[0], ctx(teams, pool))).toBeCloseTo(1, 5);
  });

  describe('pacingCap (piano di spesa)', () => {
    // Replica della formula: riserva = pacingReserve x spesa attesa degli
    // altri slot (preferenze tutte 1 con createTestBotConfig)
    function expectedOtherSpend(bot: Team, role: Player['role'], c: ReturnType<typeof ctx>): number {
      const other = getRemainingSlots(bot);
      other[role]--;
      return getExpectedSpend(other, c.market);
    }

    it('un bot con molti slot futuri non supera la riserva', () => {
      const bot = createTestTeam({
        credits: 200,
        botConfig: createTestBotConfig('normale', 'equilibrato'),
      });
      const c = ctx([bot], pool);
      const limit = getBotLimit(bot, pool[0], c);
      const reserve = ARCHETYPE_PROFILES.equilibrato.pacingReserve;
      const pacingCap = 1 + (bot.credits - 8) - reserve * expectedOtherSpend(bot, 'A', c);
      expect(limit).toBeLessThanOrEqual(Math.floor(pacingCap));
    });

    it('lo stesso bot all\'ultimo slot ha un limite più alto', () => {
      const full = createTestTeam({
        credits: 200,
        botConfig: createTestBotConfig('normale', 'equilibrato'),
      });
      const lastSlot = createTestTeam({
        credits: 200,
        botConfig: createTestBotConfig('normale', 'equilibrato'),
        roster: buildRoster({ P: 1, D: 2, C: 3, A: 1 }),
      });
      const c = ctx([full, lastSlot], pool);
      expect(getBotLimit(lastSlot, pool[0], c))
        .toBeGreaterThan(getBotLimit(full, pool[0], c));
    });

    it('sui pupilli la riserva è dimezzata (PUPILLO_PACING_FACTOR)', () => {
      const plain = createTestTeam({
        credits: 200,
        botConfig: createTestBotConfig('normale', 'cacciatore'),
      });
      const hunter = createTestTeam({
        credits: 200,
        botConfig: createTestBotConfig('normale', 'cacciatore', [pool[0].id]),
      });
      const c = ctx([plain, hunter], pool);
      const reserve = ARCHETYPE_PROFILES.cacciatore.pacingReserve;
      const expected = expectedOtherSpend(hunter, 'A', c);
      const pacingCapPupillo =
        1 + (hunter.credits - 8) - reserve * PUPILLO_PACING_FACTOR * expected;
      const limitPupillo = getBotLimit(hunter, pool[0], c);
      expect(limitPupillo).toBeLessThanOrEqual(Math.floor(pacingCapPupillo));
      // La riserva dimezzata + moltiplicatore pupillo non abbassano il limite
      expect(limitPupillo).toBeGreaterThanOrEqual(getBotLimit(plain, pool[0], c));
    });
  });

  describe('softCap progressivo (fillProgress)', () => {
    // 8 slot liberi -> share = quota dell'archetipo; 2 slot -> si allenta
    // verso MAX_SOFT_CAP_SHARE. Pool ricco per non far bindare il raw.
    const richPool = [
      createTestPlayer({ id: 'top', role: 'A', baseValue: 50 }),
      createTestPlayer({ id: 'm1', role: 'A', baseValue: 20 }),
      createTestPlayer({ id: 'm2', role: 'A', baseValue: 15 }),
      createTestPlayer({ id: 'm3', role: 'A', baseValue: 10 }),
    ];

    it('con 2 slot il limite su un top player può superare il 55% del budget libero', () => {
      const bot = createTestTeam({
        credits: 100,
        botConfig: createTestBotConfig('normale', 'equilibrato'),
        roster: buildRoster({ P: 1, D: 2, C: 3 }), // restano 2 slot A
      });
      // Rivali che hanno ancora bisogno di A (altrimenti rivalCap = 1)
      const rivals = Array.from({ length: 3 }, (_, i) =>
        createTestTeam({ id: `riv${i}`, credits: 100 })
      );
      const c = ctx([bot, ...rivals], richPool);
      const limit = getBotLimit(bot, richPool[0], c);
      // share 0.55 -> cap ~54; con fillProgress lo share sale verso 0.95
      expect(limit).toBeGreaterThan(Math.floor(1 + 0.55 * (bot.credits - 2)));
      // ma mai oltre il tetto assoluto MAX_SOFT_CAP_SHARE
      expect(limit).toBeLessThanOrEqual(
        Math.floor(1 + MAX_SOFT_CAP_SHARE * (bot.credits - 2))
      );
    });

    it('con 8 slot la quota dell\'archetipo resta il tetto', () => {
      const bot = createTestTeam({
        credits: 100,
        botConfig: createTestBotConfig('normale', 'equilibrato'),
      });
      const c = ctx([bot], richPool);
      const limit = getBotLimit(bot, richPool[0], c);
      expect(limit).toBeLessThanOrEqual(
        Math.floor(1 + ARCHETYPE_PROFILES.equilibrato.maxShareOfBudget * (bot.credits - 8))
      );
    });
  });

  describe('softCap con reparto focus', () => {
    it('la quota focus è limitata a MAX_SOFT_CAP_SHARE', () => {
      const focused = createTestTeam({
        credits: 500,
        botConfig: {
          ...createTestBotConfig('normale', 'equilibrato'),
          rolePreferences: { P: 1, D: 1, C: 1, A: 1.6 },
        },
      });
      const c = ctx([focused], pool);
      const limit = getBotLimit(focused, pool[0], c);
      // 0.55 x 1.6 = 0.88 -> cappato a 0.75
      expect(limit).toBeLessThanOrEqual(
        Math.floor(1 + MAX_SOFT_CAP_SHARE * (focused.credits - 8))
      );
    });

    it('senza focus la share è baseShare x preferenza (sotto il tetto)', () => {
      // Preferenza 1.2: 0.55 x 1.2 = 0.66 < 0.75 -> niente tetto
      const mild = createTestTeam({
        credits: 500,
        botConfig: {
          ...createTestBotConfig('normale', 'equilibrato'),
          rolePreferences: { P: 1, D: 1, C: 1, A: 1.2 },
        },
      });
      const c = ctx([mild], pool);
      const limit = getBotLimit(mild, pool[0], c);
      const share = ARCHETYPE_PROFILES.equilibrato.maxShareOfBudget * 1.2;
      expect(limit).toBeLessThanOrEqual(
        Math.floor(1 + share * (mild.credits - 8))
      );
    });
  });

  describe('personalityWeight', () => {
    it('in difficile il divario aggressivo/parsimonioso sul limite è minore che in normale', () => {
      const realPool = buildAuctionPool(PLAYERS_DATABASE);
      const top = realPool
        .filter(p => p.role === 'A')
        .sort((a, b) => b.baseValue - a.baseValue)[0];
      const rivals = Array.from({ length: 6 }, (_, i) =>
        createTestTeam({ id: `r${i}`, credits: 100 })
      );
      const gap = (difficulty: 'normale' | 'difficile') => {
        const aggr = createTestTeam({
          id: `aggr-${difficulty}`,
          credits: 100,
          botConfig: createTestBotConfig(difficulty, 'aggressivo'),
        });
        const pars = createTestTeam({
          id: `pars-${difficulty}`,
          credits: 100,
          botConfig: createTestBotConfig(difficulty, 'parsimonioso'),
        });
        const c = ctx([aggr, pars, ...rivals], realPool);
        return getBotLimit(aggr, top, c) - getBotLimit(pars, top, c);
      };
      expect(gap('normale')).toBeGreaterThan(gap('difficile'));
    });
  });

  describe('rivalLimitFactors (cache per chiamata)', () => {
    it('rivalLimitFactors + applyRivalLimitFactors equivalgono a estimateRivalLimit', () => {
      const teams = [
        createTestTeam({ id: 'a', credits: 300 }),
        createTestTeam({ id: 'b', credits: 80, roster: buildRoster({ P: 1, D: 2, C: 3 }) }),
        createTestTeam({ id: 'c', credits: 500, roster: buildRoster({ A: 2 }) }), // A completato
      ];
      const c = ctx(teams, pool);
      for (const team of teams) {
        for (const player of pool) {
          const factors = rivalLimitFactors(team, player.role, c);
          expect(applyRivalLimitFactors(factors, player, c.market))
            .toBe(estimateRivalLimit(team, player, c));
        }
      }
      // Ruolo non necessario -> attivo falso e limite 0
      const done = rivalLimitFactors(teams[2], 'A', c);
      expect(done.active).toBe(false);
      expect(applyRivalLimitFactors(done, pool[0], c.market)).toBe(0);
    });
  });
});
