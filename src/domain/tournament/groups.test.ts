import { describe, expect, it } from 'vitest';
import type { MatchResult } from '../match/matchTypes';
import { createRng } from '../../services/auction/rng';
import type { TournamentState } from './tournamentTypes';
import { tournamentTeams } from '../../test/matchFixtures';
import { buildGroupStage, computeStandings } from './groups';
import { buildTournamentSummary, createTournament, drawOrder, simulateRemaining, tournamentReducer } from './index';

function result(homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number): MatchResult {
  return {
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    winnerId: homeScore === awayScore ? null : homeScore > awayScore ? homeTeamId : awayTeamId,
    shootout: null,
  } as MatchResult;
}

function grouped(seed = 7) {
  const teams = tournamentTeams();
  let state = createTournament({ teams, seasonId: '2015-16', seed, format: 'groups' });
  state = tournamentReducer(state, { type: 'DRAW', order: drawOrder(state, createRng(seed)) });
  return { state, teams };
}

describe('fase a gironi andata e ritorno', () => {
  it('crea 6 giornate da due partite per girone, con ogni coppia due volte a campi invertiti', () => {
    const { groups, fixtures } = buildGroupStage(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 123);
    expect(groups.A).toEqual(['a', 'b', 'c', 'd']);
    expect(groups.B).toEqual(['e', 'f', 'g', 'h']);
    expect(fixtures).toHaveLength(24);
    for (const group of ['A', 'B'] as const) {
      const gf = fixtures.filter(f => f.group === group);
      for (let day = 1; day <= 6; day++) expect(gf.filter(f => f.matchday === day)).toHaveLength(2);
      for (const home of groups[group]) {
        const played = gf.filter(f => f.homeId === home || f.awayId === home);
        expect(played).toHaveLength(6);
        expect(played.filter(f => f.homeId === home)).toHaveLength(3);
        expect(played.filter(f => f.awayId === home)).toHaveLength(3);
      }
      const pairs = new Map<string, typeof gf>();
      for (const fixture of gf) {
        const key = [fixture.homeId, fixture.awayId].sort().join(':');
        pairs.set(key, [...(pairs.get(key) ?? []), fixture]);
      }
      expect(pairs.size).toBe(6);
      for (const matches of pairs.values()) {
        expect(matches).toHaveLength(2);
        expect(matches[0].homeId).toBe(matches[1].awayId);
        expect(matches[0].awayId).toBe(matches[1].homeId);
      }
      for (let day = 1; day < 6; day++) {
        const today = gf.filter(f => f.matchday === day).map(f => [f.homeId, f.awayId].sort().join(':'));
        const tomorrow = gf.filter(f => f.matchday === day + 1).map(f => [f.homeId, f.awayId].sort().join(':'));
        expect(today.some(pair => tomorrow.includes(pair))).toBe(false);
      }
    }
  });

  it('registra il pareggio di girone senza vincitore e senza rigori', () => {
    const { state } = grouped(8);
    const fixture = state.groups!.fixtures[0];
    const started = tournamentReducer(state, { type: 'START_MATCH', matchId: fixture.id });
    const drawn = tournamentReducer(started, {
      type: 'RECORD_RESULT',
      matchId: fixture.id,
      result: result(fixture.homeId, fixture.awayId, 1, 1),
    });
    expect(drawn.matches[fixture.id].winnerId).toBeNull();
    expect(drawn.currentMatchId).toBeNull();
  });

  it('classifica 3/1/0 e usa la mini-classifica negli scontri diretti', () => {
    const { state } = grouped();
    const [a, b, c, d] = state.groups!.groups.A;
    const matches = {
      [`GA-G1-1`]: result(a, d, 1, 0),
      [`GA-G1-2`]: result(b, c, 1, 0),
      [`GA-G2-1`]: result(d, c, 1, 0),
      [`GA-G2-2`]: result(a, b, 1, 0),
      [`GA-G3-1`]: result(b, d, 1, 0),
      [`GA-G3-2`]: result(c, a, 1, 0),
    } as unknown as TournamentState['matches'];
    const current = { ...state, matches };
    const standings = computeStandings(current, 'A');
    expect(standings.slice(0, 2).map(row => [row.teamId, row.points])).toEqual([[a, 6], [b, 6]]);
    expect(standings.slice(2).map(row => row.points)).toEqual([3, 3]);
    expect(computeStandings(current, 'A')).toEqual(standings);
  });

  it('mantiene calendario, qualificazioni e riepiloghi validi su 25 seed', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const { state, teams } = grouped(seed);
      const completed = simulateRemaining(state, teams);
      expect(completed.status).toBe('completed');
      expect(Object.keys(completed.matches)).toHaveLength(28);
      expect(computeStandings(completed, 'A').filter(row => row.status === 'qualified')).toHaveLength(2);
      expect(computeStandings(completed, 'B').filter(row => row.status === 'qualified')).toHaveLength(2);
      const summary = buildTournamentSummary(completed, teams);
      expect(summary.groupRecord).not.toBeNull();
      expect([6, 7, 8]).toContain(summary.matches.length);
    }
  });

  it('simula i gironi e final four fino al terzo posto senza partite duplicate', () => {
    const { state, teams } = grouped(41);
    const completed = simulateRemaining(state, teams);
    expect(completed.status).toBe('completed');
    expect(Object.keys(completed.matches)).toHaveLength(28);
    expect(completed.bracket.find(match => match.id === 'F')?.winnerId).toBe(completed.winnerId);
    expect(completed.bracket.find(match => match.id === '3P')?.winnerId).toBeTruthy();
    const firstA = computeStandings(completed, 'A')[0].teamId;
    const secondA = computeStandings(completed, 'A')[1].teamId;
    const firstB = computeStandings(completed, 'B')[0].teamId;
    const secondB = computeStandings(completed, 'B')[1].teamId;
    expect(completed.bracket.find(match => match.id === 'SF1')).toMatchObject({ homeId: firstA, awayId: secondB });
    expect(completed.bracket.find(match => match.id === 'SF2')).toMatchObject({ homeId: firstB, awayId: secondA });
    expect(completed.groups?.fixtures).toHaveLength(24);
    expect(computeStandings(completed, 'A').filter(row => row.status === 'qualified')).toHaveLength(2);
    expect(computeStandings(completed, 'A').filter(row => row.status === 'eliminated')).toHaveLength(2);
  });
});
