import { describe, expect, it } from 'vitest';
import { createTestPlayer, createTestTeam } from '../../test/testUtils';
import { teamRating } from './teamStrength';
import { benchPlayers, autoLineup, FORMATIONS, FORMATION_IDS, formationCoverage, isValidLineup, lineupPlayers, validateLineup } from './formations';

function roster() {
  return [
    createTestPlayer({ id: 'p0', role: 'P' }),
    ...Array.from({ length: 4 }, (_, i) => createTestPlayer({ id: `d${i}`, role: 'D', overall: 80 + i })),
    ...Array.from({ length: 4 }, (_, i) => createTestPlayer({ id: `c${i}`, role: 'C', overall: 80 + i })),
    ...Array.from({ length: 3 }, (_, i) => createTestPlayer({ id: `a${i}`, role: 'A', overall: 80 + i })),
  ];
}

describe('formazioni e rose', () => {
  it('tutte le sei formazioni compongono 8 titolari validi da una rosa 1-4-4-3', () => {
    const players = roster();
    expect(players).toHaveLength(12);
    expect(formationCoverage(players)).toEqual(Object.fromEntries(FORMATION_IDS.map(id => [id, { filled: 8, total: 8 }])));
    for (const id of FORMATION_IDS) {
      const lineup = autoLineup(players, id);
      expect(lineup.starters).toHaveLength(8);
      expect(isValidLineup(players, lineup)).toBe(true);
      expect(FORMATIONS[id].layout).toHaveLength(8);
    }
  });

  it('rifiuta conteggio errato, duplicati, giocatori fuori rosa e ruoli incompatibili', () => {
    const players = roster();
    const valid = autoLineup(players, '2-3-2');
    expect(validateLineup(players, { ...valid, starters: valid.starters.slice(1) }).some(e => e.code === 'count')).toBe(true);
    expect(validateLineup(players, { ...valid, starters: [valid.starters[0], ...valid.starters.slice(1, 7), valid.starters[1]] }).some(e => e.code === 'duplicate')).toBe(true);
    expect(validateLineup(players, { ...valid, starters: [...valid.starters.slice(0, 7), 'not-in-roster'] }).some(e => e.code === 'not_in_roster')).toBe(true);
    const wrongRole = [...valid.starters];
    wrongRole[1] = 'c0';
    expect(validateLineup(players, { ...valid, starters: wrongRole }).some(e => e.code === 'wrong_role')).toBe(true);
  });

  it('riserve e titolari sono quattro, distinti e senza doppioni', () => {
    const players = roster();
    const lineup = autoLineup(players, '3-3-1');
    const starters = lineupPlayers(players, lineup);
    const bench = benchPlayers(players, lineup);
    expect(starters).toHaveLength(8);
    expect(bench).toHaveLength(4);
    expect(new Set([...starters, ...bench].map(p => p.id)).size).toBe(12);
    expect(bench.every(p => !lineup.starters.includes(p.id))).toBe(true);
  });

  it('le riserve non contribuiscono al rating quando il lineup è fissato', () => {
    const players = roster();
    const lineup = autoLineup(players, '2-4-1');
    const team = createTestTeam({ roster: players.map(player => ({ player, purchasePrice: 1 })), lineup });
    const baseline = teamRating(team);
    const benchIds = new Set(benchPlayers(players, lineup).map(player => player.id));
    const improvedBench = {
      ...team,
      roster: team.roster.map(owned => benchIds.has(owned.player.id)
        ? { ...owned, player: { ...owned.player, overall: 95 } }
        : owned),
    };
    expect(teamRating(improvedBench)).toBe(baseline);
  });
});
