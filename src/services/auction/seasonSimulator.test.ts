import { describe, it, expect } from 'vitest';
import { runAuction } from './simulator';
import { createRng, hashSeed } from './rng';
import { createInitialAuctionState, auctionReducer, AuctionWorld } from './session';
import { buildAuctionPool, LEAGUE_SIZE } from './rules';
import { generateAllTeams } from '../teamGenerator';
import { ROSTER_REQUIREMENTS, DifficultyLevel, Player } from '../../types';
import seasonDoc from '../../../public/data/seasons/2015-16.json';

const SEASON_PLAYERS = seasonDoc.players as Player[];

function makeWorld(difficulty: DifficultyLevel): AuctionWorld {
  const pool = buildAuctionPool(SEASON_PLAYERS);
  return {
    teams: generateAllTeams(
      'User',
      difficulty,
      pool,
      createRng(hashSeed('teams', difficulty))
    ),
    auction: createInitialAuctionState(pool),
  };
}

function start(world: AuctionWorld): AuctionWorld {
  return auctionReducer(world, {
    type: 'START',
    callingOrder: world.teams.map(t => t.id),
  });
}

describe('simulator — asta su dati storici 2015-16', () => {
  const difficulties: DifficultyLevel[] = ['normale', 'difficile'];
  const seeds = [11, 22, 33];

  for (const difficulty of difficulties) {
    for (const seed of seeds) {
      it(`${difficulty} x ${LEAGUE_SIZE} squadre, seed ${seed}: completa e coerente`, () => {
        const world = runAuction(start(makeWorld(difficulty)), {
          rng: createRng(seed),
          until: 'auction_end',
          startTime: 0,
          userAutopilot: true,
        });

        expect(world.auction.phase).toBe('complete');
        expect(world.auction.assignedPlayers).toHaveLength(LEAGUE_SIZE * 8);

        const ids = world.auction.assignedPlayers.map(a => a.playerId);
        expect(new Set(ids).size).toBe(ids.length);

        for (const team of world.teams) {
          expect(team.roster).toHaveLength(8);
          const counts = { P: 0, D: 0, C: 0, A: 0 };
          for (const o of team.roster) counts[o.player.role]++;
          for (const role of ['P', 'D', 'C', 'A'] as const) {
            expect(counts[role]).toBe(ROSTER_REQUIREMENTS[role].total);
          }
          expect(team.credits).toBeGreaterThanOrEqual(0);
          const spent = team.roster.reduce((s, o) => s + o.purchasePrice, 0);
          expect(team.credits + spent).toBe(team.initialCredits);
        }
      });
    }

    it(`${difficulty} x ${LEAGUE_SIZE} squadre: spesa media e minima dei bot`, () => {
      const ratios: number[] = [];
      for (const seed of seeds) {
        const world = runAuction(start(makeWorld(difficulty)), {
          rng: createRng(seed),
          until: 'auction_end',
          startTime: 0,
          userAutopilot: true,
        });
        for (const team of world.teams.filter(t => !t.isUserTeam)) {
          const spent = team.roster.reduce((s, o) => s + o.purchasePrice, 0);
          ratios.push(spent / team.initialCredits);
        }
      }
      const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      const min = Math.min(...ratios);
      console.log(`spend ${difficulty} x ${LEAGUE_SIZE} (2015-16): mean=${avg.toFixed(3)} min=${min.toFixed(3)}`);
      expect(avg).toBeGreaterThanOrEqual(0.9);
      expect(min).toBeGreaterThanOrEqual(0.5);
    });
  }
});
