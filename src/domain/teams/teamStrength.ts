import { Player, PlayerRole, ROSTER_REQUIREMENTS } from '../../types';
import { playerOverall } from '../../services/auction/teamStrength';
import { autoLineup, FORMATIONS, FORMATION_IDS, FormationId, isValidLineup, lineupPlayers } from './formations';

/**
 * Forza di squadra per il motore partita.
 *
 * Gli overall del listone sono compressi (circa 75-95): per far pesare
 * davvero le differenze si normalizzano su una scala 0-1 con
 * q = (overall × forma − OVERALL_FLOOR) / OVERALL_SPAN.
 * Ogni reparto ha un ruolo diverso nella pipeline delle occasioni
 * (portiere -> parate, difesa -> occasioni concesse, centrocampo ->
 * controllo, attacco -> creazione e conversione).
 */

/** Overall che vale q = 0 */
export const OVERALL_FLOOR = 70;
/** Ampiezza della scala: overall 95 -> q = 1 */
export const OVERALL_SPAN = 25;
/** Limite superiore di q (un 95 in forma 1.10 supera 1) */
export const MAX_QUALITY = 1.4;

/** Pesi dei reparti nella forza complessiva mostrata in UI */
export const FORMATION_RATING_WEIGHTS: Record<FormationId, Record<PlayerRole, number>> = {
  '2-3-2': { P: 0.1, D: 0.25, C: 0.35, A: 0.3 },
  '3-2-2': { P: 0.12, D: 0.35, C: 0.3, A: 0.23 },
  '2-2-3': { P: 0.08, D: 0.2, C: 0.28, A: 0.44 },
  '3-3-1': { P: 0.08, D: 0.22, C: 0.48, A: 0.22 },
  '2-4-1': { P: 0.08, D: 0.2, C: 0.5, A: 0.22 },
  '3-1-3': { P: 0.08, D: 0.3, C: 0.22, A: 0.4 },
};

/** Qualità normalizzata di un giocatore con la forma del giorno */
export function playerQuality(player: Player, form = 1): number {
  const q = (playerOverall(player) * form - OVERALL_FLOOR) / OVERALL_SPAN;
  return Math.min(MAX_QUALITY, Math.max(0, q));
}

/** Forma della partita da due uniformi: triangolare in [0.90, 1.10] */
export function formFromUniforms(u1: number, u2: number): number {
  return Math.round((0.9 + 0.2 * ((u1 + u2) / 2)) * 1000) / 1000;
}

/** Stato minimo di un giocatore per il calcolo dei reparti */
export interface StrengthPlayer {
  role: PlayerRole;
  quality: number;
  active: boolean;
  injured: boolean;
}

/** Malus di un giocatore infortunato che resta in campo (niente panchina) */
export const INJURY_FACTOR = 0.8;
/** Portiere sostitutivo (un giocatore di movimento tra i pali) */
export const EMERGENCY_GK_QUALITY = 0.1;

/**
 * Forza di un reparto: media dei giocatori attivi × sqrt(attivi/richiesti).
 * Un'espulsione indebolisce il reparto senza azzerarlo.
 */
export function departmentStrength(players: StrengthPlayer[], role: PlayerRole, required = ROSTER_REQUIREMENTS[role].total): number {
  const active = players.filter(p => p.role === role && p.active);
  if (active.length === 0) return role === 'P' ? EMERGENCY_GK_QUALITY : 0;
  const mean =
    active.reduce((s, p) => s + p.quality * (p.injured ? INJURY_FACTOR : 1), 0) / active.length;
  return mean * Math.sqrt(Math.min(1, active.length / required));
}

/**
 * Sinergia: piccolo modificatore leggibile.
 * - equilibrio tra reparti: +2% se omogenei, fino a -2% se sbilanciati;
 * - intesa di club: +1% per ogni compagno di squadra reale in più, max +3%.
 */
export function computeSynergy(
  players: { role: PlayerRole; quality: number; club: string }[]
): { synergy: number; chemistryClub: string | null; chemistryCount: number } {
  const depts = (['P', 'D', 'C', 'A'] as PlayerRole[]).map(role => {
    const ps = players.filter(p => p.role === role);
    return ps.length ? ps.reduce((s, p) => s + p.quality, 0) / ps.length : 0;
  });
  const spread = Math.max(...depts) - Math.min(...depts);
  const balance = Math.max(-0.02, Math.min(0.02, 0.02 - 0.06 * spread));

  const byClub = new Map<string, number>();
  for (const p of players) byClub.set(p.club, (byClub.get(p.club) ?? 0) + 1);
  let pairs = 0;
  let chemistryClub: string | null = null;
  let chemistryCount = 1;
  for (const [club, n] of byClub) {
    if (n >= 2) pairs += n - 1;
    if (n > chemistryCount) {
      chemistryCount = n;
      chemistryClub = club;
    }
  }
  const chemistry = Math.min(0.03, 0.01 * pairs);
  return {
    synergy: Math.round((1 + balance + chemistry) * 1000) / 1000,
    chemistryClub: chemistryCount >= 2 ? chemistryClub : null,
    chemistryCount: chemistryCount >= 2 ? chemistryCount : 0,
  };
}

/**
 * Rigori parati: `penaltySaveProbability` nei dati è il rapporto grezzo
 * parati/battuti, su campioni piccolissimi (3/3 -> 1.0, mai affrontati ->
 * 0): il numero dei rigori affrontati si ricava dal rapporto e la stima
 * viene "ristretta" verso una media a priori (PRIOR, peso W pari a un
 * campione virtuale di 10 rigori). Mai affrontati -> PRIOR.
 */
export const PENALTY_SAVE_PRIOR = 0.2;
export const PENALTY_SAVE_PRIOR_WEIGHT = 10;
export function penaltySaveSkill(player: Player): number {
  const saved = player.stats?.penaltiesSaved ?? 0;
  const r = player.penaltySaveProbability;
  // I rigori affrontati non possono essere meno di quelli parati
  const faced = Math.max(saved, r && r > 0 ? Math.round(saved / r) : 0);
  return (saved + PENALTY_SAVE_PRIOR_WEIGHT * PENALTY_SAVE_PRIOR) / (faced + PENALTY_SAVE_PRIOR_WEIGHT);
}

/** Forza complessiva (pesata per ruolo) riportata in scala overall */
export function weightedRating(depts: { gk: number; def: number; mid: number; att: number }, formation: FormationId = '2-3-2'): number {
  const weights = FORMATION_RATING_WEIGHTS[formation];
  const q = weights.P * depts.gk + weights.D * depts.def + weights.C * depts.mid + weights.A * depts.att;
  return Math.round(OVERALL_FLOOR + OVERALL_SPAN * q);
}

export function lineupRating(players: Player[], formation: FormationId): number {
  const lineup = players.length > 8 ? lineupPlayers(players, autoLineup(players, formation)) : players;
  const sp: StrengthPlayer[] = lineup.map(player => ({
    role: player.role,
    quality: playerQuality(player),
    active: true,
    injured: false,
  }));
  const { synergy } = computeSynergy(
    lineup.map(player => ({ role: player.role, quality: playerQuality(player), club: player.team }))
  );
  const counts = FORMATIONS[formation].counts;
  const depts = {
    gk: departmentStrength(sp, 'P', 1) * synergy,
    def: departmentStrength(sp, 'D', counts.D) * synergy,
    mid: departmentStrength(sp, 'C', counts.C) * synergy,
    att: departmentStrength(sp, 'A', counts.A) * synergy,
  };
  const weights = FORMATION_RATING_WEIGHTS[formation];
  const q = weights.P * depts.gk + weights.D * depts.def + weights.C * depts.mid + weights.A * depts.att;
  return Math.round(OVERALL_FLOOR + OVERALL_SPAN * q);
}

export function rosterRating(players: Player[]): number {
  if (players.length === 8) {
    const compatible = FORMATION_IDS.find(formation => {
      const expected = FORMATIONS[formation].layout;
      return (['P', 'D', 'C', 'A'] as PlayerRole[]).every(role => expected.filter(slot => slot.role === role).length === players.filter(player => player.role === role).length);
    });
    return lineupRating(players, compatible ?? '2-3-2');
  }
  return Math.max(...FORMATION_IDS.map(formation => lineupRating(players, formation)), 0);
}

export function teamRating(team: import('../../types').Team): number {
  const players = team.roster.map(owned => owned.player);
  const lineup = team.lineup && isValidLineup(players, team.lineup)
    ? team.lineup
    : autoLineup(players, team.botConfig?.preferredFormation ?? '2-3-2');
  return lineupRating(lineupPlayers(players, lineup), lineup.formation);
}
