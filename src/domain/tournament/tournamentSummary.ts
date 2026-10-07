import { PlayerRole, Team } from '../../types';
import { SITE_URL } from '../../config';
import { playerOverall } from '../../services/auction/teamStrength';
import { shortName } from '../match/matchEvents';
import { ROUND_SHORT, userPath } from './bracket';
import { TournamentRound, TournamentState } from './tournamentTypes';

/**
 * Riepilogo del torneo dal punto di vista dell'utente: alimenta la
 * schermata finale e la card condivisibile.
 */

export type Placement = 'campione' | 'finalista' | 'semifinalista' | 'quarti';

export const PLACEMENT_LABELS: Record<Placement, string> = {
  campione: 'Campione',
  finalista: 'Finalista',
  semifinalista: 'Semifinalista',
  quarti: 'Eliminato ai quarti',
};

export interface SummaryMatch {
  matchId: string;
  round: TournamentRound;
  roundShort: string;
  opponentName: string;
  goalsFor: number;
  goalsAgainst: number;
  shootout: { for: number; against: number } | null;
  won: boolean;
}

export interface TournamentSummary {
  tournamentName: string;
  seasonId: string;
  teamName: string;
  placement: Placement;
  placementLabel: string;
  matches: SummaryMatch[];
  scorers: { playerId: string; name: string; goals: number }[];
  mvp: { playerId: string; name: string; role: PlayerRole; avgFantasy: number } | null;
  lineup: { playerId: string; name: string; role: PlayerRole; overall: number }[];
  stats: { played: number; wins: number; goalsFor: number; goalsAgainst: number; cleanSheets: number };
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
  for (const m of userPath(state)) {
    const r = state.matches[m.id];
    if (!r) continue;
    const home = r.homeTeamId === userId;
    matches.push({
      matchId: m.id,
      round: m.round,
      roundShort: ROUND_SHORT[m.round],
      opponentName: home ? r.awayName : r.homeName,
      goalsFor: home ? r.homeScore : r.awayScore,
      goalsAgainst: home ? r.awayScore : r.homeScore,
      shootout: r.shootout
        ? { for: home ? r.shootout.home : r.shootout.away, against: home ? r.shootout.away : r.shootout.home }
        : null,
      won: r.winnerId === userId,
    });
    for (const p of r.playerPerformances) {
      if (p.teamId !== userId) continue;
      if (p.goals) goals.set(p.playerId, (goals.get(p.playerId) ?? 0) + p.goals);
      fantasy.set(p.playerId, [...(fantasy.get(p.playerId) ?? []), p.fantasyScore]);
    }
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
  const placement: Placement =
    state.winnerId === userId
      ? 'campione'
      : last?.round === 'final'
        ? 'finalista'
        : last?.round === 'semifinals'
          ? 'semifinalista'
          : 'quarti';

  return {
    tournamentName: state.name,
    seasonId: state.seasonId,
    teamName: user?.name ?? '',
    placement,
    placementLabel: PLACEMENT_LABELS[placement],
    matches,
    scorers: [...goals.entries()]
      .map(([playerId, n]) => ({ playerId, name: playerName(playerId), goals: n }))
      .sort((a, b) => b.goals - a.goals),
    mvp,
    lineup: roster.map(p => ({ playerId: p.id, name: shortName(p.name), role: p.role, overall: playerOverall(p) })),
    stats: {
      played: matches.length,
      wins: matches.filter(m => m.won).length,
      goalsFor: matches.reduce((s, m) => s + m.goalsFor, 0),
      goalsAgainst: matches.reduce((s, m) => s + m.goalsAgainst, 0),
      cleanSheets: matches.filter(m => m.goalsAgainst === 0).length,
    },
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
