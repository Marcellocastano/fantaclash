import { MatchSide } from '../domain/match';
import {
  currentStageMatches,
  drawOrder,
  findCompetitionMatch,
  randomTournamentSeed,
  simulateCompetitionMatch,
} from '../domain/tournament';
import { resultHash } from './hash';
import { RoomAction, RoomState } from './protocol';

export function buildStartTournament(rng: () => number = Math.random): RoomAction {
  void rng;
  return { type: 'START_TOURNAMENT', seed: randomTournamentSeed() };
}

export function buildDraw(state: RoomState, rng: () => number): RoomAction | null {
  if (state.phase !== 'tournament' || state.tournament?.status !== 'draw') return null;
  return { type: 'TOURNAMENT', action: { type: 'DRAW', order: drawOrder(state.tournament, rng) } };
}

export function buildLineupWindow(
  state: RoomState,
  kind: 'post_auction' | 'pre_stage',
  deadline: number
): RoomAction | null {
  if (kind === 'post_auction' && (state.phase !== 'auction' || state.auction?.phase !== 'complete')) return null;
  if (kind === 'pre_stage' && (state.phase !== 'tournament' || !state.tournament || Object.keys(state.live).length > 0)) return null;
  const playing = kind === 'pre_stage' && state.tournament
    ? new Set(currentStageMatches(state.tournament).flatMap(match => [match.homeId, match.awayId]))
    : null;
  const teamIds = state.teams
    .filter(team => team.controller === 'human' && (!playing || playing.has(team.id)))
    .map(team => team.id);
  if (teamIds.length === 0) return null;
  return { type: 'LINEUP_WINDOW', window: { deadline, kind, teamIds } };
}

export function buildRoundRecords(state: RoomState): RoomAction[] {
  if (state.phase !== 'tournament' || !state.tournament) return [];
  return currentStageMatches(state.tournament).map(match => {
    const result = simulateCompetitionMatch(state.tournament!, state.teams, match.id, {});
    return {
      type: 'MATCH_RECORD' as const,
      matchId: match.id,
      seed: match.seed,
      options: {},
      resultHash: resultHash(result),
    };
  });
}

export function liveHumanSides(state: RoomState, matchId: string): MatchSide[] {
  const match = state.tournament ? findCompetitionMatch(state.tournament, matchId) : null;
  if (!match) return [];
  const sides: MatchSide[] = [];
  for (const [side, teamId] of [['home', match.homeId], ['away', match.awayId]] as const) {
    const team = state.teams.find(candidate => candidate.id === teamId);
    if (team?.controller === 'human') sides.push(side);
  }
  return sides;
}

export function buildRoundStart(state: RoomState, startAt: number): RoomAction[] {
  if (state.phase !== 'tournament' || !state.tournament || state.lineupWindow) return [];
  return currentStageMatches(state.tournament).flatMap(match => {
    if (state.live[match.id]) return [];
    const humanSides = liveHumanSides(state, match.id);
    return humanSides.length ? [{ type: 'MATCH_START' as const, matchId: match.id, startAt, humanSides }] : [];
  });
}

export function buildBotRecords(state: RoomState): RoomAction[] {
  if (state.phase !== 'tournament' || !state.tournament) return [];
  return currentStageMatches(state.tournament).flatMap(match => {
    if (state.live[match.id] || liveHumanSides(state, match.id).length > 0) return [];
    const result = simulateCompetitionMatch(state.tournament!, state.teams, match.id, {});
    return [{
      type: 'MATCH_RECORD' as const,
      matchId: match.id,
      seed: match.seed,
      options: {},
      resultHash: resultHash(result),
    }];
  });
}
