import { Team } from '../../types';
import { hashSeed, Rng, shuffle } from '../../services/auction/rng';
import { simulateMatch } from '../match/matchEngine';
import { MatchOptions, MatchResult, MatchTeamInput } from '../match/matchTypes';
import { teamRating } from '../teams/teamStrength';
import { autoLineup, isValidLineup, lineupPlayers } from '../teams/formations';
import { createBracket, createFinalFourBracket, currentRound, findMatch, roundMatches } from './bracket';
import { currentGroupMatchday, groupMatchday } from './groups';
import type { CompetitionFormat } from '../../types';
import { tournamentReducer } from './tournamentReducer';
import { TournamentState, TournamentTeam } from './tournamentTypes';

/**
 * Operazioni di alto livello sul torneo: creazione, sorteggio,
 * simulazione delle partite. Tutto puro: le squadre (rose) arrivano dal
 * GameState, il torneo conserva solo id e risultati.
 */

export const TOURNAMENT_NAME = 'FantaClash Cup';

/** Sigla di 2 lettere per l'avatar della squadra */
export function monogram(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? '?').slice(0, 2).toUpperCase();
}

export function toTournamentTeam(team: Team): TournamentTeam {
  return {
    id: team.id,
    name: team.name,
    isUserTeam: team.isUserTeam,
    rating: teamRating(team),
    monogram: monogram(team.name),
  };
}

export function toMatchTeam(team: Team): MatchTeamInput {
  const roster = team.roster.map(owned => owned.player);
  const formation = team.lineup?.formation ?? '2-3-2';
  const lineup = team.lineup && isValidLineup(roster, team.lineup) ? team.lineup : autoLineup(roster, formation);
  return { id: team.id, name: team.name, players: lineupPlayers(roster, lineup), formation };
}

export interface CreateTournamentInput {
  teams: Team[];
  seasonId: string;
  seed: number;
  format?: CompetitionFormat;
  /** Nome della coppa (stanze multiplayer); default FantaClash Cup */
  name?: string;
}

/** Torneo in stato 'draw', tabellone vuoto */
export function createTournament({ teams, seasonId, seed, name, format = 'knockout' }: CreateTournamentInput): TournamentState {
  const user = teams.find(t => t.isUserTeam);
  return {
    id: `cup-${seed.toString(36)}`,
    name: name?.trim() || TOURNAMENT_NAME,
    format,
    seasonId,
    userTeamId: user?.id ?? '',
    teams: teams.map(toTournamentTeam),
    groups: null,
    bracket: format === 'groups' ? createFinalFourBracket(seed) : createBracket(seed),
    currentMatchId: null,
    matches: {},
    status: 'draw',
    winnerId: null,
  };
}

/** Ordine del sorteggio: permutazione casuale degli 8 id */
export function drawOrder(state: TournamentState, rng: Rng): string[] {
  return shuffle(
    state.teams.map(t => t.id),
    rng
  );
}

/** Simula una partita del tabellone (stesso seme -> stesso risultato) */
export interface CompetitionMatch {
  id: string;
  stage: 'groups' | TournamentState['status'];
  label: string;
  homeId: string;
  awayId: string;
  seed: number;
  allowDraw: boolean;
}

export function findCompetitionMatch(state: TournamentState, matchId: string): CompetitionMatch | null {
  const fixture = state.groups?.fixtures.find(candidate => candidate.id === matchId);
  if (fixture) return {
    id: fixture.id,
    stage: 'groups',
    label: `Girone ${fixture.group} · Giornata ${fixture.matchday} · ${fixture.leg}`,
    homeId: fixture.homeId,
    awayId: fixture.awayId,
    seed: fixture.seed,
    allowDraw: true,
  };
  const match = findMatch(state.bracket, matchId);
  if (!match?.homeId || !match.awayId) return null;
  return {
    id: match.id,
    stage: state.status,
    label: match.round,
    homeId: match.homeId,
    awayId: match.awayId,
    seed: match.seed,
    allowDraw: false,
  };
}

export function simulateCompetitionMatch(
  state: TournamentState,
  teams: Team[],
  matchId: string,
  options?: MatchOptions
): MatchResult {
  const match = findCompetitionMatch(state, matchId);
  const home = teams.find(team => team.id === match?.homeId);
  const away = teams.find(team => team.id === match?.awayId);
  if (!match || !home || !away) throw new Error(`Partita ${matchId} non giocabile`);
  return simulateMatch({
    home: toMatchTeam(home),
    away: toMatchTeam(away),
    seed: match.seed,
    options: { ...options, allowDraw: options?.allowDraw ?? match.allowDraw },
  });
}

export function simulateBracketMatch(state: TournamentState, teams: Team[], matchId: string, options?: MatchOptions): MatchResult {
  return simulateCompetitionMatch(state, teams, matchId, options);
}

/**
 * Simula tutte le partite pronte del turno corrente escluse quelle in
 * `skip` (tipicamente la partita dell'utente).
 */
export function currentStageMatches(state: TournamentState): CompetitionMatch[] {
  if (state.status === 'groups') {
    const day = currentGroupMatchday(state);
    if (day === null) return [];
    return groupMatchday(state, day).flatMap(fixture => {
      const match = findCompetitionMatch(state, fixture.id);
      return match && !state.matches[fixture.id] ? [match] : [];
    });
  }
  const round = currentRound(state.status);
  if (!round) return [];
  const matches = roundMatches(state.bracket, round);
  if (state.format === 'groups' && round === 'final') {
    matches.push(...roundMatches(state.bracket, 'third_place'));
  }
  return matches.flatMap(match => {
    const competitionMatch = findCompetitionMatch(state, match.id);
    return competitionMatch && !match.winnerId ? [competitionMatch] : [];
  });
}

export function simulateStage(state: TournamentState, teams: Team[], skip: string[] = []): TournamentState {
  let next = state;
  for (const match of currentStageMatches(state)) {
    if (skip.includes(match.id)) continue;
    next = tournamentReducer(next, {
      type: 'RECORD_RESULT',
      matchId: match.id,
      result: simulateCompetitionMatch(next, teams, match.id),
    });
  }
  return next;
}

export function simulateRound(state: TournamentState, teams: Team[], skip: string[] = []): TournamentState {
  return simulateStage(state, teams, skip);
}

export function simulateRemaining(state: TournamentState, teams: Team[]): TournamentState {
  let next = state.currentMatchId ? tournamentReducer(state, { type: 'LEAVE_MATCH' }) : state;
  for (let i = 0; i < 20 && next.status !== 'completed' && next.status !== 'draw'; i++) {
    const following = simulateStage(next, teams);
    if (following === next) break;
    next = following;
  }
  return next;
}

/** Seme casuale del torneo (gioco); nei test si passa un seme fisso */
export function randomTournamentSeed(): number {
  return hashSeed(Date.now(), Math.random());
}
