import { describe, it, expect } from 'vitest';
import { ROSTER_REQUIREMENTS, Player } from '../types';
import { buildAuctionPool } from './auction/rules';
import { createInitialAuctionState, auctionReducer, AuctionWorld } from './auction/session';
import { runAuction } from './auction/simulator';
import { createRng, hashSeed } from './auction/rng';
import { generateAllTeams } from './teamGenerator';
import { isLegends, LEGENDS_ID, listoneLabel, listoneShort, seasonShort } from './seasons';
import legendsDoc from '../../public/data/seasons/legends.json';

const LEGENDS = legendsDoc.players as Player[];

describe('listone Legends (public/data/seasons/legends.json)', () => {
  it('96 giocatori con i conteggi per ruolo, overall 84-99 e flag legend', () => {
    const counts = { P: 0, D: 0, C: 0, A: 0 };
    for (const p of LEGENDS) {
      counts[p.role]++;
      expect(p.legend).toBe(true);
      expect(p.overall).toBeGreaterThanOrEqual(84);
      expect(p.overall).toBeLessThanOrEqual(99);
      expect(p.season).toMatch(/^\d{4}-\d{2}$/);
      expect(p.baseValue).toBeGreaterThanOrEqual(1);
    }
    expect(LEGENDS).toHaveLength(96);
    expect(counts).toEqual({ P: 12, D: 24, C: 36, A: 24 });
    expect(new Set(LEGENDS.map(p => p.id)).size).toBe(96);
    // un 99 per ruolo
    for (const role of ['P', 'D', 'C', 'A'] as const) {
      expect(Math.max(...LEGENDS.filter(p => p.role === role).map(p => p.overall!))).toBe(99);
    }
  });

  it('asta completa sul listone: 8 rose da 8, crediti mai negativi', () => {
    for (const seed of [7, 42]) {
      const pool = buildAuctionPool(LEGENDS);
      const world = runAuction(
        start({
          teams: generateAllTeams('User', 'normale', pool, createRng(hashSeed('teams', 'legends', seed))),
          auction: createInitialAuctionState(pool),
        }),
        { rng: createRng(hashSeed('auction', 'legends', seed)), until: 'auction_end', startTime: 0, userAutopilot: true }
      );
      expect(world.auction.phase).toBe('complete');
      for (const team of world.teams) {
        expect(team.roster).toHaveLength(8);
        const counts = { P: 0, D: 0, C: 0, A: 0 };
        for (const o of team.roster) counts[o.player.role]++;
        for (const role of ['P', 'D', 'C', 'A'] as const) {
          expect(counts[role]).toBe(ROSTER_REQUIREMENTS[role].total);
        }
        expect(team.credits).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

function start(world: AuctionWorld): AuctionWorld {
  return auctionReducer(world, { type: 'START', callingOrder: world.teams.map(t => t.id) });
}

describe('etichette del listone', () => {
  it('legends vs annata', () => {
    expect(isLegends(LEGENDS_ID)).toBe(true);
    expect(isLegends('2015-16')).toBe(false);
    expect(listoneLabel(LEGENDS_ID)).toBe('Serie A Legends');
    expect(listoneLabel('2015-16')).toBe('Serie A 2015-16');
    expect(listoneShort(LEGENDS_ID)).toBe('Legends');
    expect(listoneShort('2015-16')).toBe('2015-16');
    expect(seasonShort('2009-10')).toBe('09-10');
    expect(seasonShort('legends')).toBe('legends');
  });
});
