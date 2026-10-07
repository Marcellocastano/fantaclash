import { Team } from '../../types';
import { hashSeed, Rng, shuffle } from '../../services/auction/rng';
import { simulateMatch } from '../match/matchEngine';
import { MatchOptions, MatchResult, MatchTeamInput } from '../match/matchTypes';
import { rosterRating } from '../teams/teamStrength';
import { createBracket, currentRound, findMatch, getMatchStatus, ROUNDS, roundMatches } from './bracket';
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
    rating: rosterRating(team.roster.map(o => o.player)),
    monogram: monogram(team.name),
  };
}

export function toMatchTeam(team: Team): MatchTeamInput {
  return { id: team.id, name: team.name, players: team.roster.map(o => o.player) };
}

export interface CreateTournamentInput {
  teams: Team[];
  seasonId: string;
  seed: number;
}

/** Torneo in stato 'draw', tabellone vuoto */
export function createTournament({ teams, seasonId, seed }: CreateTournamentInput): TournamentState {
  const user = teams.find(t => t.isUserTeam);
  return {
    id: `cup-${seed.toString(36)}`,
    name: TOURNAMENT_NAME,
    seasonId,
    userTeamId: user?.id ?? '',
    teams: teams.map(toTournamentTeam),
    bracket: createBracket(seed),
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
export function simulateBracketMatch(
  state: TournamentState,
  teams: Team[],
  matchId: string,
  options?: MatchOptions
): MatchResult {
  const match = findMatch(state.bracket, matchId);
  const home = teams.find(t => t.id === match?.homeId);
  const away = teams.find(t => t.id === match?.awayId);
  if (!match || !home || !away) throw new Error(`Partita ${matchId} non giocabile`);
  return simulateMatch({ home: toMatchTeam(home), away: toMatchTeam(away), seed: match.seed, options });
}

/**
 * Simula tutte le partite pronte del turno corrente escluse quelle in
 * `skip` (tipicamente la partita dell'utente).
 */
export function simulateRound(state: TournamentState, teams: Team[], skip: string[] = []): TournamentState {
  const round = currentRound(state.status);
  if (!round) return state;
  let next = state;
  for (const m of roundMatches(state.bracket, round)) {
    if (skip.includes(m.id) || getMatchStatus(next, m) !== 'ready') continue;
    next = tournamentReducer(next, {
      type: 'RECORD_RESULT',
      matchId: m.id,
      result: simulateBracketMatch(next, teams, m.id),
    });
  }
  return next;
}

/** Simula il torneo fino alla fine (anche le partite dell'utente, con IA) */
export function simulateRemaining(state: TournamentState, teams: Team[]): TournamentState {
  let next = state.currentMatchId ? tournamentReducer(state, { type: 'LEAVE_MATCH' }) : state;
  for (let i = 0; i < ROUNDS.length && next.status !== 'completed' && next.status !== 'draw'; i++) {
    next = simulateRound(next, teams);
  }
  return next;
}

/** Seme casuale del torneo (gioco); nei test si passa un seme fisso */
export function randomTournamentSeed(): number {
  return hashSeed(Date.now(), Math.random());
}
