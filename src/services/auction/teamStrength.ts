import { Player, Team } from '../../types';

/**
 * Forza di una squadra: media dell'overall dei giocatori in rosa.
 * Metrica condivisa tra la suite di equilibrio dell'asta e (in futuro)
 * il motore del torneo. Senza overall (database di esempio) si usa
 * una stima dalla media voto.
 */

/** Overall del giocatore, con ripiego sulla media voto (5.5 -> 50, 7.0 -> 95) */
export function playerOverall(player: Player): number {
  if (typeof player.overall === 'number') return player.overall;
  return Math.round(50 + 45 * Math.min(1, Math.max(0, (player.avgRating - 5.5) / 1.5)));
}

/** Media dell'overall della rosa (0 se vuota) */
export function teamStrength(team: Team): number {
  if (team.roster.length === 0) return 0;
  return team.roster.reduce((sum, o) => sum + playerOverall(o.player), 0) / team.roster.length;
}
