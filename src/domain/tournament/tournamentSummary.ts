import { PlayerRole, Team } from '../../types';
import { SITE_URL } from '../../config';
import { playerOverall } from '../../services/auction/teamStrength';
import { autoLineup, lineupPlayers } from '../teams/formations';
import type { FormationId } from '../teams/formations';
import { shortName } from '../match/matchEvents';
import { ROUND_SHORT, userPath } from './bracket';
import { computeStandings } from './groups';
import { TournamentRound, TournamentState } from './tournamentTypes';

/**
 * Riepilogo del torneo dal punto di vista dell'utente: alimenta la
 * schermata finale e la card condivisibile.
 */

export type Placement = 'campione' | 'finalista' | 'terzo' | 'quarto' | 'semifinalista' | 'quarti' | 'fuori_ai_gironi';

export const PLACEMENT_LABELS: Record<Placement, string> = {
  campione: 'Campione',
  finalista: 'Finalista',
  semifinalista: 'Semifinalista',
  quarti: 'Eliminato ai quarti',
  terzo: 'Terzo posto',
  quarto: 'Quarto posto',
  fuori_ai_gironi: 'Eliminato ai gironi',
};

export interface SummaryMatch {
  matchId: string;
  round: TournamentRound | 'groups';
  roundShort: string;
  opponentName: string;
  goalsFor: number;
  goalsAgainst: number;
  shootout: { for: number; against: number } | null;
  won: boolean;
  draw: boolean;
}

export interface TournamentSummary {
  tournamentName: string;
  format: TournamentState['format'];
  seasonId: string;
  teamName: string;
  placement: Placement;
  placementLabel: string;
  matches: SummaryMatch[];
  scorers: { playerId: string; name: string; goals: number }[];
  mvp: { playerId: string; name: string; role: PlayerRole; avgFantasy: number } | null;
  lineup: { playerId: string; name: string; role: PlayerRole; overall: number }[];
  formation: FormationId;
  stats: { played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; cleanSheets: number };
  groupRecord: { position: number; points: number; wins: number; draws: number; losses: number } | null;
  championName: string | null;
  opponents: string[];
}

const ROLE_ORDER: PlayerRole[] = ['P', 'D', 'C', 'A'];

export function buildTournamentSummary(state: TournamentState, teams: Team[]): TournamentSummary {
  const userId = state.userTeamId;
  const user = teams.find(t => t.id === userId);
  const nameOf = (id: string | null) => state.teams.find(t => t.id === id)?.name ?? '';

  const matches: SummaryMatch[] = [];
  const goals = new Map<string, number>();
  const fantasy = new Map<string, number[]>();
  const appendResult = (matchId: string, round: TournamentRound | 'groups', roundShort: string) => {
    const result = state.matches[matchId];
    if (!result) return;
    const home = result.homeTeamId === userId;
    matches.push({
      matchId,
      round,
      roundShort,
      opponentName: home ? result.awayName : result.homeName,
      goalsFor: home ? result.homeScore : result.awayScore,
      goalsAgainst: home ? result.awayScore : result.homeScore,
      shootout: result.shootout
        ? { for: home ? result.shootout.home : result.shootout.away, against: home ? result.shootout.away : result.shootout.home }
        : null,
      won: result.winnerId === userId,
      draw: result.winnerId === null,
    });
    for (const performance of result.playerPerformances) {
      if (performance.teamId !== userId) continue;
      if (performance.goals) goals.set(performance.playerId, (goals.get(performance.playerId) ?? 0) + performance.goals);
      fantasy.set(performance.playerId, [...(fantasy.get(performance.playerId) ?? []), performance.fantasyScore]);
    }
  };
  if (state.format === 'groups') {
    for (const fixture of state.groups?.fixtures ?? []) {
      if (fixture.homeId === userId || fixture.awayId === userId) appendResult(fixture.id, 'groups', `G${fixture.matchday}`);
    }
    const cupMatches = state.bracket
      .filter(match => (match.round === 'semifinals' || match.round === 'final' || match.round === 'third_place') && (match.homeId === userId || match.awayId === userId))
      .sort((a, b) => (a.round === 'semifinals' ? 0 : 1) - (b.round === 'semifinals' ? 0 : 1));
    for (const match of cupMatches) appendResult(match.id, match.round, ROUND_SHORT[match.round]);
  } else {
    for (const match of userPath(state)) appendResult(match.id, match.round, ROUND_SHORT[match.round]);
  }

  const roster = [...(user?.roster ?? [])]
    .map(o => o.player)
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
  const playerName = (id: string) => shortName(roster.find(p => p.id === id)?.name ?? '');

  let mvp: TournamentSummary['mvp'] = null;
  for (const [playerId, scores] of fantasy) {
    const avg = scores.reduce((s, x) => s + x, 0) / scores.length;
    if (!mvp || avg > mvp.avgFantasy) {
      const p = roster.find(x => x.id === playerId);
      if (p) mvp = { playerId, name: shortName(p.name), role: p.role, avgFantasy: Math.round(avg * 10) / 10 };
    }
  }

  const last = matches[matches.length - 1];
  const lastResult = last ? state.matches[last.matchId] : undefined;
  const lastSide = lastResult?.homeTeamId === userId ? 'home' : 'away';
  const lineup = lastResult
    ? lineupPlayers(roster, {
        formation: lastResult.formations[lastSide],
        starters: lastResult.lineups[lastSide].map(player => player.playerId),
      })
    : lineupPlayers(roster, autoLineup(roster, user?.lineup?.formation ?? '2-3-2'));
  const group = state.groups?.groups.A.includes(userId) ? 'A' : state.groups?.groups.B.includes(userId) ? 'B' : null;
  const standing = group ? computeStandings(state, group).find(row => row.teamId === userId) : undefined;
  const groupRecord = standing ? {
    position: standing.position,
    points: standing.points,
    wins: standing.wins,
    draws: standing.draws,
    losses: standing.losses,
  } : null;
  const placement: Placement = state.winnerId === userId
    ? 'campione'
    : state.format === 'groups'
      ? last?.round === 'third_place'
        ? last.won ? 'terzo' : 'quarto'
        : last?.round === 'final'
          ? 'finalista'
          : !groupRecord || groupRecord.position > 2
            ? 'fuori_ai_gironi'
            : 'semifinalista'
      : last?.round === 'final'
        ? 'finalista'
        : last?.round === 'semifinals'
          ? 'semifinalista'
          : 'quarti';

  return {
    tournamentName: state.name,
    format: state.format,
    seasonId: state.seasonId,
    teamName: user?.name ?? '',
    placement,
    placementLabel: PLACEMENT_LABELS[placement],
    matches,
    scorers: [...goals.entries()]
      .map(([playerId, n]) => ({ playerId, name: playerName(playerId), goals: n }))
      .sort((a, b) => b.goals - a.goals),
    mvp,
    lineup: lineup.map(p => ({ playerId: p.id, name: shortName(p.name), role: p.role, overall: playerOverall(p) })),
    formation: lastResult?.formations[lastSide] ?? user?.lineup?.formation ?? '2-3-2',
    stats: {
      played: matches.length,
      wins: matches.filter(match => match.won).length,
      draws: matches.filter(match => match.draw).length,
      losses: matches.filter(match => !match.won && !match.draw).length,
      goalsFor: matches.reduce((s, m) => s + m.goalsFor, 0),
      goalsAgainst: matches.reduce((s, m) => s + m.goalsAgainst, 0),
      cleanSheets: matches.filter(m => m.goalsAgainst === 0).length,
    },
    groupRecord,
    championName: state.winnerId ? nameOf(state.winnerId) : null,
    opponents: matches.map(m => m.opponentName),
  };
}

/** Testo per la condivisione social */
export function shareText(summary: TournamentSummary): string {
  const results = summary.matches
    .map(m => {
      const so = m.shootout ? ` (${m.shootout.for}-${m.shootout.against} rig.)` : '';
      return `${m.roundShort} ${m.goalsFor}-${m.goalsAgainst}${so} vs ${m.opponentName}`;
    })
    .join(', ');
  return `${summary.teamName}: ${summary.placementLabel.toLowerCase()} della ${summary.tournamentName} (Serie A ${summary.seasonId}). ${results}. #FantaClash ${SITE_URL}/`;
}
