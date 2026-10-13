import { Team } from '../../types';
import { hashSeed, Rng, shuffle } from '../../services/auction/rng';
import { simulateMatch } from '../match/matchEngine';
import { MatchOptions, MatchResult, MatchTeamInput } from '../match/matchTypes';
import { rosterRating } from '../teams/teamStrength';
import {
  createBracket,
  currentRound,
  findMatch,
  getMatchStatus,
  legKey,
  legResult,
  legSeed,
  legSides,
  matchLegs,
  nextLeg,
  roundMatches,
} from './bracket';
import { tournamentReducer } from './tournamentReducer';
import { TournamentFormat, TournamentState, TournamentTeam } from './tournamentTypes';

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
  /** Nome della coppa (stanze multiplayer); default FantaClash Cup */
  name?: string;
  /** 'double' = quarti e semifinali andata/ritorno, finale secca */
  format?: TournamentFormat;
}

/** Torneo in stato 'draw', tabellone vuoto */
export function createTournament({ teams, seasonId, seed, name, format }: CreateTournamentInput): TournamentState {
  const user = teams.find(t => t.isUserTeam);
  return {
    id: `cup-${seed.toString(36)}`,
    name: name?.trim() || TOURNAMENT_NAME,
    seasonId,
    format: format === 'double' ? 'double' : 'single',
    userTeamId: user?.id ?? '',
    teams: teams.map(toTournamentTeam),
    bracket: createBracket(seed, format),
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

/**
 * Simula la prossima gara del confronto (andata, ritorno o gara secca).
 * Nel formato a due gare passa il contesto `twoLegged` al motore: al
 * ritorno l'andata va invertita (casa/ospiti si scambiano).
 */
export function simulateBracketMatch(
  state: TournamentState,
  teams: Team[],
  matchId: string,
  options?: MatchOptions
): MatchResult {
  const match = findMatch(state.bracket, matchId);
  const leg = match ? (nextLeg(state, match) ?? 1) : 1;
  const sides = match ? legSides(match, leg) : null;
  const home = teams.find(t => t.id === sides?.homeId);
  const away = teams.find(t => t.id === sides?.awayId);
  if (!match || !sides || !home || !away) throw new Error(`Partita ${matchId} non giocabile`);
  const opts: MatchOptions = { ...options };
  if (matchLegs(match) === 2) {
    if (leg === 1) {
      opts.twoLegged = { leg: 1 };
    } else {
      const first = legResult(state, match, 1);
      if (!first) throw new Error(`Partita ${matchId}: manca l'andata`);
      // l'andata vista dai lati del ritorno: al ritorno in casa c'era chi ospitava
      opts.twoLegged = { leg: 2, firstLeg: { home: first.awayScore, away: first.homeScore } };
    }
  }
  return simulateMatch({ home: toMatchTeam(home), away: toMatchTeam(away), seed: legSeed(match, leg), options: opts });
}

/**
 * Simula tutte le gare pronte del turno corrente escluse quelle in
 * `skip` (tipicamente il confronto dell'utente). Prima tutte le andate,
 * poi i ritorni.
 */
export function simulateRound(state: TournamentState, teams: Team[], skip: string[] = []): TournamentState {
  const round = currentRound(state.status);
  if (!round) return state;
  let next = state;
  for (const m of roundMatches(state.bracket, round)) {
    if (skip.includes(m.id) || getMatchStatus(next, m) !== 'ready') continue;
    const leg = nextLeg(next, m);
    if (!leg) continue;
    next = tournamentReducer(next, {
      type: 'RECORD_RESULT',
      matchId: legKey(m.id, leg),
      result: simulateBracketMatch(next, teams, m.id),
    });
  }
  return next;
}

/**
 * Simula il torneo fino alla fine (anche le partite dell'utente, con IA).
 * Ogni giro simula le gare pronte del turno: andate, poi ritorni, poi
 * il turno successivo.
 */
export function simulateRemaining(state: TournamentState, teams: Team[]): TournamentState {
  let next = state.currentMatchId ? tournamentReducer(state, { type: 'LEAVE_MATCH' }) : state;
  for (let i = 0; i < 16 && next.status !== 'completed' && next.status !== 'draw'; i++) {
    const before = next;
    next = simulateRound(next, teams);
    if (next === before) break; // nessuna gara pronta: stato incoerente
  }
  return next;
}

/** Seme casuale del torneo (gioco); nei test si passa un seme fisso */
export function randomTournamentSeed(): number {
  return hashSeed(Date.now(), Math.random());
}
