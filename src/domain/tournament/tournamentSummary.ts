import { PlayerRole, Team } from '../../types';
import { SITE_URL } from '../../config';
import { playerOverall } from '../../services/auction/teamStrength';
import { CatalogKey, t } from '../../i18n/translate';
import { shortName } from '../match/matchEvents';
import { legResult, matchLegs, ROUND_SHORT_KEY, userPath } from './bracket';
import { TournamentRound, TournamentState } from './tournamentTypes';
import type { KitId } from '../teamKits';

/**
 * Riepilogo del torneo dal punto di vista dell'utente: alimenta la
 * schermata finale e la card condivisibile.
 */

export type Placement = 'campione' | 'finalista' | 'semifinalista' | 'quarti';

export const PLACEMENT_KEY: Record<Placement, CatalogKey> = {
  campione: 'tournament.placement.campione',
  finalista: 'tournament.placement.finalista',
  semifinalista: 'tournament.placement.semifinalista',
  quarti: 'tournament.placement.quarti',
};

export interface SummaryMatch {
  matchId: string;
  round: TournamentRound;
  roundShort: string;
  opponentName: string;
  /** Confronto a due gare: aggregato; gara secca: risultato */
  goalsFor: number;
  goalsAgainst: number;
  /** Punteggio di ogni gara dal punto di vista dell'utente (due gare) */
  legs?: { for: number; against: number }[];
  shootout: { for: number; against: number } | null;
  won: boolean;
}

export interface TournamentSummary {
  tournamentName: string;
  seasonId: string;
  teamName: string;
  /** Colori sociali della squadra (assente nei riepiloghi precedenti) */
  kit?: KitId;
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
    const r1 = legResult(state, m, 1);
    if (!r1) continue;
    const r2 = matchLegs(m) === 2 ? legResult(state, m, 2) : undefined;
    const results = [r1, ...(r2 ? [r2] : [])];
    // Ogni gara ha la sua prospettiva (al ritorno casa/ospiti sono invertiti)
    const userFor = (r: typeof r1) => (r.homeTeamId === userId ? r.homeScore : r.awayScore);
    const userAgainst = (r: typeof r1) => (r.homeTeamId === userId ? r.awayScore : r.homeScore);
    const last = results[results.length - 1];
    const lastHome = last.homeTeamId === userId;
    matches.push({
      matchId: m.id,
      round: m.round,
      roundShort: t(ROUND_SHORT_KEY[m.round]),
      opponentName: lastHome ? last.awayName : last.homeName,
      goalsFor: results.reduce((s, r) => s + userFor(r), 0),
      goalsAgainst: results.reduce((s, r) => s + userAgainst(r), 0),
      legs: r2 ? results.map(r => ({ for: userFor(r), against: userAgainst(r) })) : undefined,
      shootout: last.shootout
        ? { for: lastHome ? last.shootout.home : last.shootout.away, against: lastHome ? last.shootout.away : last.shootout.home }
        : null,
      won: m.winnerId === userId,
    });
    for (const r of results) {
      for (const p of r.playerPerformances) {
        if (p.teamId !== userId) continue;
        if (p.goals) goals.set(p.playerId, (goals.get(p.playerId) ?? 0) + p.goals);
        fantasy.set(p.playerId, [...(fantasy.get(p.playerId) ?? []), p.fantasyScore]);
      }
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
    kit: user?.kit,
    placement,
    placementLabel: t(PLACEMENT_KEY[placement]),
    matches,
    scorers: [...goals.entries()]
      .map(([playerId, n]) => ({ playerId, name: playerName(playerId), goals: n }))
      .sort((a, b) => b.goals - a.goals),
    mvp,
    lineup: roster.map(p => ({ playerId: p.id, name: shortName(p.name), role: p.role, overall: playerOverall(p) })),
    stats: {
      // Le statistiche contano le singole gare, non i confronti
      played: matches.reduce((s, m) => s + (m.legs?.length ?? 1), 0),
      wins: matches.reduce(
        (s, m) => s + (m.legs ?? [{ for: m.goalsFor, against: m.goalsAgainst }]).filter(l => l.for > l.against).length,
        0
      ),
      goalsFor: matches.reduce((s, m) => s + m.goalsFor, 0),
      goalsAgainst: matches.reduce((s, m) => s + m.goalsAgainst, 0),
      cleanSheets: matches.reduce(
        (s, m) => s + (m.legs ?? [{ for: m.goalsFor, against: m.goalsAgainst }]).filter(l => l.against === 0).length,
        0
      ),
    },
    championName: state.winnerId ? nameOf(state.winnerId) : null,
    opponents: matches.map(m => m.opponentName),
  };
}

/** Testo per la condivisione social */
export function shareText(summary: TournamentSummary): string {
  const results = summary.matches
    .map(m => {
      const so = m.shootout ? t('tournament.summary.shareShootout', { for: m.shootout.for, against: m.shootout.against }) : '';
      const legs = m.legs ? ` (${m.legs.map(l => `${l.for}-${l.against}`).join(', ')})` : '';
      return t('tournament.summary.shareMatch', {
        round: m.roundShort,
        goalsFor: m.goalsFor,
        goalsAgainst: m.goalsAgainst,
        legs,
        shootout: so,
        opponent: m.opponentName,
      });
    })
    .join(', ');
  const cup = summary.seasonId === 'legends' ? 'Serie A Legends' : `Serie A ${summary.seasonId}`;
  return t('tournament.summary.shareText', {
    team: summary.teamName,
    placement: summary.placementLabel.toLowerCase(),
    tournament: summary.tournamentName,
    cup,
    results,
    url: SITE_URL,
  });
}
