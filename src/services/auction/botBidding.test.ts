import { describe, it, expect } from 'vitest';
import { decideBotBid, chooseBotResponder, STANDARD_INCREMENT_RATE, GAP_INCREMENT_RATE } from './botBidding';
import { buildMarketSnapshot } from './market';
import { createRng } from './rng';
import { AuctionLot } from '../../types';
import { buildRoster, createTestBotConfig, createTestPlayer, createTestTeam } from '../../test/testUtils';

function makeLot(overrides: Partial<AuctionLot> = {}): AuctionLot {
  return {
    player: createTestPlayer({ id: 'lot-player', role: 'A', baseValue: 30 }),
    callerId: 'caller',
    currentBid: 10,
    currentBidderId: 'someone',
    bidHistory: [],
    deadline: 1_000_000,
    seed: 42,
    ...overrides,
  };
}

function league() {
  const bots = [
    createTestTeam({ id: 'b1', botConfig: createTestBotConfig('normale') }),
    createTestTeam({ id: 'b2', botConfig: createTestBotConfig('difficile') }),
  ];
  const others = [createTestTeam({ id: 'u1', isUserTeam: true }), ...bots];
  const pool = [
    createTestPlayer({ id: 'lot-player', role: 'A' as const, baseValue: 30 }),
    ...Array.from({ length: 20 }, (_, i) =>
      createTestPlayer({ id: `a-${i}`, role: 'A' as const, baseValue: 12 })
    ),
  ];
  const ctx = { teams: others, market: buildMarketSnapshot(others, pool) };
  return { bots, others, ctx, pool };
}

describe('botBidding', () => {
  it('null se il bot è il miglior offerente (stabile su 50 draw)', () => {
    const { bots, ctx } = league();
    const lot = makeLot({ currentBidderId: 'b1' });
    const rng = createRng(1);
    for (let i = 0; i < 50; i++) {
      expect(decideBotBid(bots[0], lot, ctx, rng)).toBeNull();
    }
  });

  it('null se il limite non supera l\'offerta attuale (stabile, niente re-roll)', () => {
    const { bots, ctx } = league();
    // Offerta enorme: oltre qualsiasi limite
    const lot = makeLot({ currentBid: 900 });
    const rng = createRng(2);
    for (let i = 0; i < 50; i++) {
      expect(decideBotBid(bots[0], lot, ctx, rng)).toBeNull();
      expect(decideBotBid(bots[1], lot, ctx, rng)).toBeNull();
    }
  });

  it('null se il bot non ha bisogno del ruolo', () => {
    const { ctx } = league();
    const bot = createTestTeam({
      id: 'full-a',
      botConfig: createTestBotConfig('normale'),
      roster: buildRoster({ A: 2 }),
    });
    const rng = createRng(3);
    expect(decideBotBid(bot, makeLot(), ctx, rng)).toBeNull();
  });

  it('offerta > currentBid e <= limite, anche con rilanci a salto (500 draw)', () => {
    const { bots, others, ctx } = league();
    const rng = createRng(4);
    for (let i = 0; i < 500; i++) {
      const lot = makeLot({ seed: i, currentBidderId: 'u1' });
      for (const bot of bots) {
        const bid = decideBotBid(bot, lot, ctx, rng);
        if (bid) {
          expect(bid.amount).toBeGreaterThan(lot.currentBid);
          expect(bid.amount).toBeLessThanOrEqual(bid.limit);
          expect(bid.teamId).toBe(bot.id);
        }
      }
      void others;
    }
  });

  it('incremento a distacco: max(1, 5% offerta, 20% del gap) fino al limite', () => {
    const { ctx } = league();
    const bot = createTestTeam({ id: 'bf', botConfig: createTestBotConfig('normale', 'parsimonioso') });
    const teams = [...ctx.teams, bot];
    const c2 = { teams, market: ctx.market };
    const rng = createRng(8);
    // Il rilancio atteso ricalcola la formula sul limite restituito
    for (const currentBid of [5, 40, 90]) {
      const bid = decideBotBid(bot, makeLot({ currentBid }), c2, rng);
      if (!bid) continue;
      const gapIncrement = Math.floor((bid.limit - currentBid) * GAP_INCREMENT_RATE);
      const expected = Math.min(
        currentBid + Math.max(1, Math.round(currentBid * STANDARD_INCREMENT_RATE), gapIncrement),
        bid.limit
      );
      expect(bid.amount).toBe(expected);
    }
    // Con gap ampio l'incremento a distacco domina quello proporzionale
    const far = decideBotBid(bot, makeLot({ currentBid: 5 }), c2, rng);
    expect(far).not.toBeNull();
    expect(far!.amount - 5).toBeGreaterThan(Math.ceil(5 * STANDARD_INCREMENT_RATE));
    expect(STANDARD_INCREMENT_RATE).toBe(0.05);
    expect(GAP_INCREMENT_RATE).toBe(0.2);
  });

  it('chooseBotResponder restituisce null se nessuno vuole rilanciare', () => {
    const { bots, ctx } = league();
    const lot = makeLot({ currentBid: 900 });
    expect(chooseBotResponder(bots, lot, ctx, createRng(5))).toBeNull();
  });

  it('chooseBotResponder sceglie un bot disposto', () => {
    const { bots, ctx } = league();
    const bid = chooseBotResponder(bots, makeLot({ currentBidderId: 'u1' }), ctx, createRng(6));
    expect(bid).not.toBeNull();
    expect(['b1', 'b2']).toContain(bid!.teamId);
  });
});
