import {
  currentRound,
  drawOrder,
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
