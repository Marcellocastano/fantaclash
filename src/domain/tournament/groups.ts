import { hashSeed } from '../../services/auction/rng.js';
import type { MatchResult } from '../match/matchTypes.js';
import type { GroupFixture, GroupStanding, GroupStage, TournamentState } from './tournamentTypes.js';

const FIRST_LEG: [number, number][][] = [
  [[0, 3], [1, 2]],
  [[3, 2], [0, 1]],
  [[1, 3], [2, 0]],
];

export function buildGroupStage(order: string[], seed: number): GroupStage {
  const groups = { A: order.slice(0, 4), B: order.slice(4, 8) };
  const fixtures: GroupFixture[] = [];
  for (const group of ['A', 'B'] as const) {
    const teams = groups[group];
    for (let day = 1; day <= 6; day++) {
      const template = FIRST_LEG[(day - 1) % 3];
      const returnLeg = day > 3;
      template.forEach(([homeIndex, awayIndex], index) => {
        const home = teams[returnLeg ? awayIndex : homeIndex];
        const away = teams[returnLeg ? homeIndex : awayIndex];
        const id = `G${group}-G${day}-${index + 1}`;
        fixtures.push({
          id,
          group,
          matchday: day,
          leg: returnLeg ? 'ritorno' : 'andata',
          homeId: home,
          awayId: away,
          seed: hashSeed(seed, id),
        });
      });
    }
  }
  return { groups, fixtures };
}

interface Totals {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

function zero(teamId: string): Totals {
  return { teamId, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
}

function applyResult(stats: Totals, result: MatchResult, side: 'home' | 'away'): void {
  const own = side === 'home' ? result.homeScore : result.awayScore;
  const against = side === 'home' ? result.awayScore : result.homeScore;
  stats.played++;
  stats.goalsFor += own;
  stats.goalsAgainst += against;
  if (own > against) {
    stats.wins++;
    stats.points += 3;
  } else if (own === against) {
    stats.draws++;
    stats.points++;
  } else stats.losses++;
}

function headToHead(state: TournamentState, ids: Set<string>): Map<string, Totals> {
  const result = new Map([...ids].map(id => [id, zero(id)]));
  for (const fixture of state.groups?.fixtures ?? []) {
    if (!ids.has(fixture.homeId) || !ids.has(fixture.awayId)) continue;
    const match = state.matches[fixture.id];
    if (!match) continue;
    applyResult(result.get(fixture.homeId)!, match, 'home');
    applyResult(result.get(fixture.awayId)!, match, 'away');
  }
  return result;
}

export function currentGroupMatchday(state: TournamentState): number | null {
  if (!state.groups) return null;
  const remaining = state.groups.fixtures.filter(f => !state.matches[f.id]);
  return remaining.length ? Math.min(...remaining.map(f => f.matchday)) : null;
}

export function groupMatchday(state: TournamentState, matchday: number): GroupFixture[] {
  return (state.groups?.fixtures ?? []).filter(f => f.matchday === matchday);
}

export function computeStandings(state: TournamentState, group: 'A' | 'B'): GroupStanding[] {
  const ids = state.groups?.groups[group] ?? [];
  const totals = new Map(ids.map(id => [id, zero(id)]));
  for (const fixture of state.groups?.fixtures ?? []) {
    if (fixture.group !== group) continue;
    const result = state.matches[fixture.id];
    if (!result) continue;
    applyResult(totals.get(fixture.homeId)!, result, 'home');
    applyResult(totals.get(fixture.awayId)!, result, 'away');
  }
  const overallTieBreak = (a: Totals, b: Totals) =>
    ((b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)) ||
    (b.goalsFor - a.goalsFor) ||
    (b.wins - a.wins) ||
    (hashSeed(state.id, b.teamId) - hashSeed(state.id, a.teamId));
  const headToHeadKey = (row: Totals) => [row.points, row.goalsFor - row.goalsAgainst, row.goalsFor].join(':');
  const resolveHeadToHead = (tied: Totals[]): Totals[] => {
    if (tied.length < 2) return tied;
    const h2h = headToHead(state, new Set(tied.map(row => row.teamId)));
    const ranked = [...tied].sort((a, b) => {
      const ah = h2h.get(a.teamId) ?? zero(a.teamId);
      const bh = h2h.get(b.teamId) ?? zero(b.teamId);
      return (bh.points - ah.points) ||
        ((bh.goalsFor - bh.goalsAgainst) - (ah.goalsFor - ah.goalsAgainst)) ||
        (bh.goalsFor - ah.goalsFor) ||
        overallTieBreak(a, b);
    });
    const buckets = new Map<string, Totals[]>();
    for (const row of ranked) {
      const key = headToHeadKey(h2h.get(row.teamId) ?? zero(row.teamId));
      buckets.set(key, [...(buckets.get(key) ?? []), row]);
    }
    if (buckets.size === 1) return ranked.sort(overallTieBreak);
    return [...buckets.values()].flatMap(bucket => bucket.length > 1 ? resolveHeadToHead(bucket) : bucket);
  };
  const byPoints = new Map<number, Totals[]>();
  for (const row of totals.values()) byPoints.set(row.points, [...(byPoints.get(row.points) ?? []), row]);
  const ordered = [...byPoints.entries()]
    .sort(([a], [b]) => b - a)
    .flatMap(([, tied]) => resolveHeadToHead(tied));
  const complete = groupMatchday(state, 6).filter(f => f.group === group).every(f => !!state.matches[f.id]);
  const unfinished = (state.groups?.fixtures ?? []).filter(f => f.group === group && !state.matches[f.id]);
  const qualifications = new Map<string, 'qualified' | 'contention' | 'eliminated'>();
  if (complete) {
    ordered.forEach((row, index) => qualifications.set(row.teamId, index < 2 ? 'qualified' : 'eliminated'));
  } else if (unfinished.length <= 4) {
    const scenarios = 3 ** unfinished.length;
    const bestRank = new Map(ids.map(id => [id, Number.POSITIVE_INFINITY]));
    const worstRank = new Map(ids.map(id => [id, 0]));
    for (let scenario = 0; scenario < scenarios; scenario++) {
      const points = new Map([...totals].map(([id, row]) => [id, row.points]));
      let code = scenario;
      for (const fixture of unfinished) {
        const outcome = code % 3;
        code = Math.floor(code / 3);
        if (outcome === 0) points.set(fixture.homeId, points.get(fixture.homeId)! + 3);
        else if (outcome === 1) {
          points.set(fixture.homeId, points.get(fixture.homeId)! + 1);
          points.set(fixture.awayId, points.get(fixture.awayId)! + 1);
        } else points.set(fixture.awayId, points.get(fixture.awayId)! + 3);
      }
      for (const id of ids) {
        const score = points.get(id)!;
        const best = 1 + ids.filter(other => points.get(other)! > score).length;
        const worst = 1 + ids.filter(other => points.get(other)! >= score && other !== id).length;
        bestRank.set(id, Math.min(bestRank.get(id)!, best));
        worstRank.set(id, Math.max(worstRank.get(id)!, worst));
      }
    }
    for (const id of ids) qualifications.set(id, worstRank.get(id)! <= 2 ? 'qualified' : bestRank.get(id)! > 2 ? 'eliminated' : 'contention');
  } else {
    ordered.forEach(row => qualifications.set(row.teamId, 'contention'));
  }
  return ordered.map((row, index) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
    position: index + 1,
    status: qualifications.get(row.teamId) ?? 'contention',
  }));
}
