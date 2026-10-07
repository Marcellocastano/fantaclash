import { describe, it, expect } from 'vitest';
import {
  ROLE_ORDER,
  LISTONE_FACTOR,
  buildAuctionPool,
  getRemainingSlots,
  getTotalRemainingSlots,
  getMaxBid,
  canBid,
  getCurrentRole,
  getNextCallerIndex,
  getMaxSupportedTeams,
} from './rules';
import { PLAYERS_DATABASE } from '../../mock/players';
import { buildRoster, createTestPlayer, createTestTeam } from '../../test/testUtils';

const FULL_ROSTER = { P: 1, D: 2, C: 3, A: 2 };

describe('rules', () => {
  describe('getRemainingSlots / getTotalRemainingSlots', () => {
    it('rosa vuota richiede P1 D2 C3 A2', () => {
      const team = createTestTeam();
      expect(getRemainingSlots(team)).toEqual({ P: 1, D: 2, C: 3, A: 2 });
      expect(getTotalRemainingSlots(team)).toBe(8);
    });

    it('conta solo gli slot fino al requisito (extra ignorati)', () => {
      const team = createTestTeam({ roster: buildRoster({ P: 2, D: 2, C: 3, A: 2 }) });
      expect(getRemainingSlots(team)).toEqual({ P: 0, D: 0, C: 0, A: 0 });
      expect(getTotalRemainingSlots(team)).toBe(0);
    });

    it('restituisce copie indipendenti: modificare il risultato non altera la cache', () => {
      const team = createTestTeam({ roster: buildRoster({ P: 1 }) });
      const first = getRemainingSlots(team);
      first.P = 99;
      first.A = -5;
      expect(getRemainingSlots(team)).toEqual({ P: 0, D: 2, C: 3, A: 2 });
      expect(getTotalRemainingSlots(team)).toBe(7);
    });
  });

  describe('getMaxBid', () => {
    it('100 crediti e 8 slot -> 93', () => {
      const team = createTestTeam({ credits: 100 });
      expect(getMaxBid(team)).toBe(93);
    });

    it('ultimo slot -> tutti i crediti', () => {
      const team = createTestTeam({
        credits: 23,
        roster: buildRoster({ P: 1, D: 2, C: 3, A: 1 }),
      });
      expect(getMaxBid(team)).toBe(23);
    });

    it('rosa completa -> 0', () => {
      const team = createTestTeam({ roster: buildRoster(FULL_ROSTER) });
      expect(getMaxBid(team)).toBe(0);
    });
  });

  describe('canBid', () => {
    const player = createTestPlayer({ role: 'P' });

    it('vero se servono il ruolo e l\'offerta è entro il massimo', () => {
      const team = createTestTeam({ credits: 100 });
      expect(canBid(team, player, 93)).toBe(true);
      expect(canBid(team, player, 94)).toBe(false);
    });

    it('falso se il ruolo è già completo', () => {
      const team = createTestTeam({ credits: 100, roster: buildRoster({ P: 1 }) });
      expect(canBid(team, player, 1)).toBe(false);
    });
  });

  describe('getCurrentRole', () => {
    it('restituisce il primo ruolo in ROLE_ORDER richiesto e presente in pool', () => {
      const teams = [createTestTeam()];
      const pool = [createTestPlayer({ role: 'D' }), createTestPlayer({ role: 'P' })];
      expect(getCurrentRole(teams, pool)).toBe('P');
    });

    it('salta un ruolo necessario ma esaurito nel pool', () => {
      const teams = [createTestTeam()];
      const pool = [createTestPlayer({ role: 'C' })];
      expect(getCurrentRole(teams, pool)).toBe('C');
    });

    it('salta un ruolo presente in pool ma non necessario', () => {
      const team = createTestTeam({ roster: buildRoster({ P: 1 }) });
      const pool = [createTestPlayer({ role: 'P' }), createTestPlayer({ role: 'A' })];
      expect(getCurrentRole([team], pool)).toBe('A');
    });

    it('null se nessun ruolo è giocabile', () => {
      const team = createTestTeam({ roster: buildRoster(FULL_ROSTER) });
      expect(getCurrentRole([team], [createTestPlayer({ role: 'P' })])).toBeNull();
    });
  });

  describe('getNextCallerIndex', () => {
    const needP = () => createTestTeam();
    const fullP = () => createTestTeam({ roster: buildRoster({ P: 1 }) });

    it('salta le squadre che non hanno bisogno del ruolo', () => {
      const order = [fullP(), needP(), fullP()];
      expect(getNextCallerIndex(order, -1, 'P')).toBe(1);
    });

    it('fa wrap-around', () => {
      const order = [needP(), fullP(), needP()];
      expect(getNextCallerIndex(order, 2, 'P')).toBe(0);
    });

    it('considera la squadra corrente per ultima', () => {
      const order = [needP(), needP()];
      expect(getNextCallerIndex(order, 0, 'P')).toBe(1);
      // Se è l\'unica a necessitare, tocca di nuovo a lei
      const order2 = [needP(), fullP()];
      expect(getNextCallerIndex(order2, 0, 'P')).toBe(0);
    });

    it('-1 se nessuna squadra necessita il ruolo', () => {
      const order = [fullP(), fullP()];
      expect(getNextCallerIndex(order, 0, 'P')).toBe(-1);
    });
  });

  it('ROLE_ORDER è P, D, C, A', () => {
    expect(ROLE_ORDER).toEqual(['P', 'D', 'C', 'A']);
  });

  it('getMaxSupportedTeams sul database reale è almeno 12', () => {
    expect(getMaxSupportedTeams(PLAYERS_DATABASE)).toBeGreaterThanOrEqual(12);
  });

  describe('buildAuctionPool', () => {
    const poolPlayer = (id: string, baseValue: number, avgRating = 6, name = id) =>
      createTestPlayer({ id, role: 'P', baseValue, avgRating, name });

    it('per n=8 prende P12 D24 C36 A24, i migliori per baseValue', () => {
      const pool = buildAuctionPool(PLAYERS_DATABASE, 8);
      const counts = { P: 0, D: 0, C: 0, A: 0 };
      for (const p of pool) counts[p.role]++;
      expect(counts).toEqual({ P: 12, D: 24, C: 36, A: 24 });

      // Ogni ruolo prende i migliori baseValue del database
      for (const role of ROLE_ORDER) {
        const expected = [...PLAYERS_DATABASE]
          .filter(p => p.role === role)
          .sort((a, b) => b.baseValue - a.baseValue || b.avgRating - a.avgRating || a.name.localeCompare(b.name))
          .slice(0, counts[role])
          .map(p => p.id);
        expect(pool.filter(p => p.role === role).map(p => p.id)).toEqual(expected);
      }
    });

    it('per n=12 prende P18 D36 C54 A36', () => {
      const pool = buildAuctionPool(PLAYERS_DATABASE, 12);
      const counts = { P: 0, D: 0, C: 0, A: 0 };
      for (const p of pool) counts[p.role]++;
      expect(counts).toEqual({ P: 18, D: 36, C: 54, A: 36 });
    });

    it('ordinamento deterministico: baseValue desc, avgRating desc, nome asc', () => {
      const players = [
        poolPlayer('z', 10, 6.0, 'Zeta'),
        poolPlayer('a', 10, 6.0, 'Alpha'),
        poolPlayer('b', 10, 7.0, 'Beta'),
        poolPlayer('c', 20, 5.0, 'Gamma'),
        poolPlayer('d', 1, 9.9, 'Delta'),
      ];
      const pool = buildAuctionPool(players, 1, 1.0); // ceil(1*1*1)=1 solo il top
      expect(pool.map(p => p.id)).toEqual(['c']);
      const pool4 = buildAuctionPool(players, 4, 1.0); // ceil(1*4*1)=4
      expect(pool4.map(p => p.id)).toEqual(['c', 'b', 'a', 'z']);
    });

    it('factor Infinity restituisce tutto il database', () => {
      const pool = buildAuctionPool(PLAYERS_DATABASE, 8, Infinity);
      expect(pool).toHaveLength(PLAYERS_DATABASE.length);
    });

    it('prende tutti se il pool del ruolo è più corto del limite', () => {
      const players = [poolPlayer('p1', 10), poolPlayer('p2', 20)];
      expect(buildAuctionPool(players, 8)).toHaveLength(2);
    });

    it('ogni numero di squadre configurabile è fattibile con il listone', () => {
      for (const n of [4, 6, 8, 10, 12]) {
        const pool = buildAuctionPool(PLAYERS_DATABASE, n, LISTONE_FACTOR);
        expect(getMaxSupportedTeams(pool)).toBeGreaterThanOrEqual(n);
      }
    });
  });
});
