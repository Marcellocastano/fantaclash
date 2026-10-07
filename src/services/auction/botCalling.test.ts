import { describe, it, expect } from 'vitest';
import { chooseBotCall } from './botCalling';
import { buildMarketSnapshot } from './market';
import { buildAuctionPool } from './rules';
import { createRng, hashSeed } from './rng';
import { PLAYERS_DATABASE } from '../../mock/players';
import { generateAllTeams } from '../teamGenerator';
import { buildRoster, createTestBotConfig, createTestPlayer, createTestTeam } from '../../test/testUtils';
import { Player, Team } from '../../types';

function ctx(teams: Team[], pool: Player[]) {
  return { teams, market: buildMarketSnapshot(teams, pool), pool };
}

describe('botCalling', () => {
  const role = 'A' as const;
  const pool = [
    createTestPlayer({ id: 'a-star', role, baseValue: 40 }),
    createTestPlayer({ id: 'a-mid', role, baseValue: 15 }),
    createTestPlayer({ id: 'a-low', role, baseValue: 5 }),
    createTestPlayer({ id: 'p-1', role: 'P', baseValue: 30 }),
  ];

  it('sceglie solo giocatori del ruolo richiesto', () => {
    const bot = createTestTeam({ botConfig: createTestBotConfig('normale') });
    const rivals = [createTestTeam(), createTestTeam()];
    const rng = createRng(1);
    for (let i = 0; i < 50; i++) {
      const d = chooseBotCall(bot, role, ctx([bot, ...rivals], pool), rng);
      expect(d!.player.role).toBe(role);
      expect(pool).toContain(d!.player);
    }
  });

  it('null se il pool del ruolo è vuoto o manca botConfig', () => {
    const bot = createTestTeam({ botConfig: createTestBotConfig('normale') });
    const noConfig = createTestTeam({ botConfig: null });
    const onlyP = pool.filter(p => p.role === 'P');
    const rng = createRng(2);
    expect(chooseBotCall(bot, role, ctx([bot], onlyP), rng)).toBeNull();
    expect(chooseBotCall(noConfig, role, ctx([noConfig], pool), rng)).toBeNull();
  });

  it('free_pick del migliore quando nessun rivale necessita il ruolo', () => {
    for (const diff of ['normale', 'difficile'] as const) {
      const bot = createTestTeam({ botConfig: createTestBotConfig(diff) });
      const full = () => createTestTeam({ roster: buildRoster({ A: 2 }) });
      const d = chooseBotCall(bot, role, ctx([bot, full(), full()], pool), createRng(3));
      expect(d!.strategy).toBe('free_pick');
      expect(d!.player.id).toBe('a-star');
    }
  });

  it('un bot difficile povero contro un rivale ricco produce chiamate drain', () => {
    const poor = createTestTeam({
      id: 'poor',
      credits: 40,
      botConfig: createTestBotConfig('difficile'),
    });
    const rich = createTestTeam({ id: 'rich', credits: 900, initialCredits: 900 });
    // Molti attaccanti costosi: il rivale ricco può permetterseli, il povero no
    const bigPool = [
      ...pool.filter(p => p.role === role),
      ...Array.from({ length: 35 }, (_, i) =>
        createTestPlayer({ id: `ax-${i}`, role, baseValue: 35 - (i % 20) })
      ),
    ];
    const strategies = new Set<string>();
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const d = chooseBotCall(poor, role, ctx([poor, rich], bigPool), rng);
      if (d) strategies.add(d.strategy);
    }
    expect(strategies.has('drain')).toBe(true);
  });

  it('varietà: prima chiamata su lega reale a 8 squadre, 100 semi', () => {
    const firstCall = (difficulty: 'normale' | 'difficile', seeds: number) => {
      const chosen = new Set<string>();
      for (let s = 0; s < seeds; s++) {
        const rng = createRng(s);
        const pool8 = buildAuctionPool(PLAYERS_DATABASE);
        const teams = generateAllTeams(
          'User', difficulty, pool8, createRng(hashSeed('teams', difficulty, s))
        );
        // Il primo bot dell'ordine chiama un portiere dal listone ridotto
        const bot = teams.find(t => !t.isUserTeam)!;
        const d = chooseBotCall(bot, 'P', ctx(teams, pool8), rng);
        if (d) chosen.add(d.player.id);
      }
      return chosen.size;
    };
    expect(firstCall('difficile', 100)).toBeGreaterThanOrEqual(2);
    expect(firstCall('normale', 100)).toBeGreaterThanOrEqual(3);
  });

  it('un cacciatore con pupillo produce chiamate "pupillo"', () => {
    // Cacciatore ricco: il suo pupillo a-star è sempre vincente contro
    // rivali poveri -> la strategia pupillo deve emergere nel softmax
    const hunter = createTestTeam({
      id: 'hunter',
      credits: 400,
      initialCredits: 400,
      botConfig: createTestBotConfig('difficile', 'cacciatore', ['a-star']),
    });
    const rivals = [
      createTestTeam({ id: 'r1', credits: 20 }),
      createTestTeam({ id: 'r2', credits: 20 }),
    ];
    const rng = createRng(11);
    let pupilloCalls = 0;
    for (let i = 0; i < 200; i++) {
      const d = chooseBotCall(hunter, role, ctx([hunter, ...rivals], pool), rng);
      if (d?.strategy === 'pupillo') {
        pupilloCalls++;
        expect(d.player.id).toBe('a-star');
      }
    }
    expect(pupilloCalls).toBeGreaterThan(0);
  });
});
