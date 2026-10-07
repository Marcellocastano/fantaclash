import { describe, it, expect } from 'vitest';
import { playerOverall, teamStrength } from './teamStrength';
import { createTestPlayer, createTestTeam, buildRoster } from '../../test/testUtils';

describe('teamStrength', () => {
  describe('playerOverall', () => {
    it('usa l\'overall quando presente', () => {
      const p = createTestPlayer({ overall: 87, avgRating: 5.6 });
      expect(playerOverall(p)).toBe(87);
    });

    it('senza overall ripiega sulla media voto (5.5 -> 50, 7.0 -> 95)', () => {
      expect(playerOverall(createTestPlayer({ avgRating: 5.5 }))).toBe(50);
      expect(playerOverall(createTestPlayer({ avgRating: 7.0 }))).toBe(95);
    });

    it('il ripiego su media voto è limitato a [50, 95]', () => {
      expect(playerOverall(createTestPlayer({ avgRating: 4.0 }))).toBe(50);
      expect(playerOverall(createTestPlayer({ avgRating: 9.0 }))).toBe(95);
    });
  });

  describe('teamStrength', () => {
    it('media degli overall della rosa', () => {
      const team = createTestTeam({
        roster: [
          { player: createTestPlayer({ overall: 80 }), purchasePrice: 10, isStarter: true, formationPosition: 1 },
          { player: createTestPlayer({ overall: 60 }), purchasePrice: 10, isStarter: true, formationPosition: 2 },
        ],
      });
      expect(teamStrength(team)).toBe(70);
    });

    it('usa il ripiego media voto per i giocatori senza overall', () => {
      const team = createTestTeam({
        roster: [
          { player: createTestPlayer({ avgRating: 7.0 }), purchasePrice: 10, isStarter: true, formationPosition: 1 },
          { player: createTestPlayer({ overall: 50 }), purchasePrice: 10, isStarter: true, formationPosition: 2 },
        ],
      });
      expect(teamStrength(team)).toBe(72.5);
    });

    it('rosa vuota -> 0', () => {
      expect(teamStrength(createTestTeam({ roster: [] }))).toBe(0);
    });

    it('rosa piena da buildRoster è finita e positiva', () => {
      const team = createTestTeam({ roster: buildRoster({ P: 1, D: 2, C: 3, A: 2 }) });
      const s = teamStrength(team);
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThanOrEqual(95);
    });
  });
});
