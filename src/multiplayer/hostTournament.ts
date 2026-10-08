import { MatchSide } from '../domain/match';
import {
  currentRound,
  drawOrder,
  findMatch,
  getMatchStatus,
  randomTournamentSeed,
  roundMatches,
  simulateBracketMatch,
} from '../domain/tournament';
import { resultHash } from './hash';
import { RoomAction, RoomState } from './protocol';

/**
 * Comandi torneo dell'host: funzioni pure che producono le RoomAction da
 * dispatchare. Il risultato delle partite è certificato con resultHash,
 * così ogni client lo ricalcola e verifica (vedi roomReducer).
 */

/** Avvia il torneo dall'asta completata (seme casuale) */
export function buildStartTournament(rng: () => number = Math.random): RoomAction {
  void rng; // il seme usa già Date.now+Math.random; rng resta per uniformità
  return { type: 'START_TOURNAMENT', seed: randomTournamentSeed() };
}

/** Sorteggio dei quarti: valido solo appena entrati in fase tournament */
export function buildDraw(state: RoomState, rng: () => number): RoomAction | null {
  if (state.phase !== 'tournament' || state.tournament?.status !== 'draw') return null;
  return { type: 'TOURNAMENT', action: { type: 'DRAW', order: drawOrder(state.tournament, rng) } };
}

/**
 * I MATCH_RECORD per tutte le partite pronte del turno corrente
 * (simulazione IA vs IA: options vuote).
 */
export function buildRoundRecords(state: RoomState): RoomAction[] {
  if (state.phase !== 'tournament' || !state.tournament) return [];
  const round = currentRound(state.tournament.status);
  if (!round) return [];
  const actions: RoomAction[] = [];
  for (const m of roundMatches(state.tournament.bracket, round)) {
    if (getMatchStatus(state.tournament, m) !== 'ready') continue;
    const result = simulateBracketMatch(state.tournament, state.teams, m.id, {});
    actions.push({
      type: 'MATCH_RECORD',
      matchId: m.id,
      seed: m.seed,
      options: {},
      resultHash: resultHash(result),
    });
  }
  return actions;
}

// ---------------------------------------------------------------------------
// Partite live del turno (F5)
// ---------------------------------------------------------------------------

/** Lati della partita controllati da un umano (controller diverso da 'bot') */
export function liveHumanSides(state: RoomState, matchId: string): MatchSide[] {
  const match = state.tournament ? findMatch(state.tournament.bracket, matchId) : undefined;
  if (!match) return [];
  const sides: MatchSide[] = [];
  for (const [side, teamId] of [['home', match.homeId], ['away', match.awayId]] as const) {
    const team = state.teams.find(t => t.id === teamId);
    if (team && team.controller !== 'bot') sides.push(side);
  }
  return sides;
}

/**
 * MATCH_START per ogni partita pronta del turno corrente con almeno un
 * lato umano. Tutte partono allo stesso `startAt` (orologio host).
 */
export function buildRoundStart(state: RoomState, startAt: number): RoomAction[] {
  if (state.phase !== 'tournament' || !state.tournament) return [];
  const round = currentRound(state.tournament.status);
  if (!round) return [];
  const actions: RoomAction[] = [];
  for (const m of roundMatches(state.tournament.bracket, round)) {
    if (getMatchStatus(state.tournament, m) !== 'ready') continue;
    if (state.live[m.id]) continue;
    const humanSides = liveHumanSides(state, m.id);
    if (humanSides.length === 0) continue;
    actions.push({ type: 'MATCH_START', matchId: m.id, startAt, humanSides });
  }
  return actions;
}

/**
 * MATCH_RECORD per le partite pronte del turno tra soli bot e non live:
 * le registra l'host quando tutte le partite live del turno sono finite
 * (così la rivelazione nell'hub arriva dopo, come nel gioco singolo).
 */
export function buildBotRecords(state: RoomState): RoomAction[] {
  if (state.phase !== 'tournament' || !state.tournament) return [];
  const round = currentRound(state.tournament.status);
  if (!round) return [];
  const actions: RoomAction[] = [];
  for (const m of roundMatches(state.tournament.bracket, round)) {
    if (getMatchStatus(state.tournament, m) !== 'ready') continue;
    if (state.live[m.id]) continue;
    if (liveHumanSides(state, m.id).length > 0) continue;
    const result = simulateBracketMatch(state.tournament, state.teams, m.id, {});
    actions.push({
      type: 'MATCH_RECORD',
      matchId: m.id,
      seed: m.seed,
      options: {},
      resultHash: resultHash(result),
    });
  }
  return actions;
}
