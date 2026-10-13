import { describe, expect, it } from 'vitest';
import { createTestPlayer } from '../../test/testUtils';
import { autoLineup, FORMATIONS, FORMATION_IDS, lineupPlayers } from '../teams/formations';
import type { FormationId } from '../teams/formations';
import { simulateMatch } from './matchEngine';
import type { MatchTeamInput } from './matchTypes';

const SEEDS = 60;

type ModuleMetrics = { points: number; games: number; goals: number; conceded: number; possession: number; counters: number };

function team(id: string, formation: FormationId): MatchTeamInput {
  const roster = [
    createTestPlayer({ id: `${id}-p`, role: 'P', overall: 84 }),
    ...Array.from({ length: 4 }, (_, i) => createTestPlayer({ id: `${id}-d${i}`, role: 'D', overall: 84 })),
    ...Array.from({ length: 4 }, (_, i) => createTestPlayer({ id: `${id}-c${i}`, role: 'C', overall: 84 })),
    ...Array.from({ length: 3 }, (_, i) => createTestPlayer({ id: `${id}-a${i}`, role: 'A', overall: 84 })),
  ];
  const lineup = autoLineup(roster, formation);
  return { id, name: id, formation, players: lineupPlayers(roster, lineup) };
}

const results = (() => {
  const metrics = Object.fromEntries(FORMATION_IDS.map(id => [id, { points: 0, games: 0, goals: 0, conceded: 0, possession: 0, counters: 0 }])) as Record<FormationId, ModuleMetrics>;
  const matrix = new Map<string, number>();
  for (const homeFormation of FORMATION_IDS) {
    for (const awayFormation of FORMATION_IDS) {
      let points = 0;
      for (let seed = 1; seed <= SEEDS; seed++) {
        const orientations: [FormationId, FormationId][] = homeFormation === awayFormation
          ? [[homeFormation, awayFormation]]
          : [[homeFormation, awayFormation], [awayFormation, homeFormation]];
        for (const [homeF, awayF] of orientations) {
          const result = simulateMatch({
            home: team('home', homeF),
            away: team('away', awayF),
            seed: seed * 7919,
          });
          const homePoints = result.homeScore > result.awayScore ? 1 : result.homeScore === result.awayScore ? 0.5 : 0;
          const awayPoints = 1 - homePoints;
          metrics[homeF].points += homePoints;
          metrics[awayF].points += awayPoints;
          metrics[homeF].games++;
          metrics[awayF].games++;
          metrics[homeF].goals += result.homeScore;
          metrics[homeF].conceded += result.awayScore;
          metrics[homeF].possession += result.stats.home.possession;
          metrics[homeF].counters += result.events.filter(event => event.side === 'home' && event.type === 'chance' && event.chanceKind === 'contropiede').length;
          metrics[awayF].goals += result.awayScore;
          metrics[awayF].conceded += result.homeScore;
          metrics[awayF].possession += result.stats.away.possession;
          metrics[awayF].counters += result.events.filter(event => event.side === 'away' && event.type === 'chance' && event.chanceKind === 'contropiede').length;
          if (homeF === homeFormation) points += homePoints;
          else points += awayPoints;
        }
      }
      matrix.set(`${homeFormation}/${awayFormation}`, points / (SEEDS * (homeFormation === awayFormation ? 1 : 2)));
    }
  }
  return { metrics, matrix };
})();

function share(id: FormationId): number {
  const row = results.metrics[id];
  return row.points / row.games;
}

function mean(id: FormationId, field: 'goals' | 'conceded' | 'possession' | 'counters'): number {
  const row = results.metrics[id];
  return row[field] / row.games;
}

describe('bilanciamento moduli con squadre di qualità uniforme', () => {
  it('nessun modulo domina sistematicamente nel confronto a calendario incrociato', () => {
    const ratios = FORMATION_IDS.map(id => share(id));
    console.log('punti medi per modulo', FORMATION_IDS.map((id, i) => `${id} ${ratios[i].toFixed(3)}`).join(' | '));
    expect(Math.min(...ratios)).toBeGreaterThan(0.43);
    expect(Math.max(...ratios)).toBeLessThan(0.57);
    for (const home of FORMATION_IDS) {
      for (const away of FORMATION_IDS) {
        expect(results.matrix.get(`${home}/${away}`)).toBeGreaterThan(0.32);
        expect(results.matrix.get(`${home}/${away}`)).toBeLessThan(0.68);
      }
    }
  });

  it('ogni profilo altera occasioni, possesso o transizioni senza modificare i reparti per solo numero', () => {
    const values = FORMATION_IDS.map(id => `${id}:GF ${mean(id, 'goals').toFixed(2)} GS ${mean(id, 'conceded').toFixed(2)} poss ${mean(id, 'possession').toFixed(1)} cont ${mean(id, 'counters').toFixed(2)}`);
    console.log(values.join(' | '));
    expect(mean('2-2-3', 'goals')).toBeGreaterThan(mean('3-2-2', 'goals'));
    expect(mean('3-2-2', 'conceded')).toBeLessThan(mean('2-2-3', 'conceded'));
    expect(mean('2-4-1', 'possession')).toBeGreaterThan(mean('2-3-2', 'possession'));
    expect(mean('3-3-1', 'possession')).toBeGreaterThan(mean('2-3-2', 'possession'));
    expect(mean('3-1-3', 'counters')).toBeGreaterThan(mean('2-3-2', 'counters'));
    for (const id of FORMATION_IDS) expect(FORMATIONS[id].layout).toHaveLength(8);
  });
});
