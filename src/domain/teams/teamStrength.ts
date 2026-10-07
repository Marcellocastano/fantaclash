import { Player, PlayerRole, ROSTER_REQUIREMENTS } from '../../types';
import { playerOverall } from '../../services/auction/teamStrength';

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
export const ROLE_WEIGHTS: Record<PlayerRole, number> = {
  P: 0.15,
  D: 0.25,
  C: 0.3,
  A: 0.3,
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
export function departmentStrength(players: StrengthPlayer[], role: PlayerRole): number {
  const required = ROSTER_REQUIREMENTS[role].total;
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

/** Forza complessiva (pesata per ruolo) riportata in scala overall */
export function weightedRating(depts: { gk: number; def: number; mid: number; att: number }): number {
  const q =
    ROLE_WEIGHTS.P * depts.gk +
    ROLE_WEIGHTS.D * depts.def +
    ROLE_WEIGHTS.C * depts.mid +
    ROLE_WEIGHTS.A * depts.att;
  return Math.round(OVERALL_FLOOR + OVERALL_SPAN * q);
}

/** Forza "da tabellone" di una rosa (forma neutra), per sorteggio e UI */
export function rosterRating(players: Player[]): number {
  const sp: StrengthPlayer[] = players.map(p => ({
    role: p.role,
    quality: playerQuality(p),
    active: true,
    injured: false,
  }));
  const { synergy } = computeSynergy(
    players.map(p => ({ role: p.role, quality: playerQuality(p), club: p.team }))
  );
  return weightedRating({
    gk: departmentStrength(sp, 'P') * synergy,
    def: departmentStrength(sp, 'D') * synergy,
    mid: departmentStrength(sp, 'C') * synergy,
    att: departmentStrength(sp, 'A') * synergy,
  });
}
