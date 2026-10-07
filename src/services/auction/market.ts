import { Player, PlayerRole, Team } from '../../types';
import { ROLE_ORDER, getRemainingSlots, getTotalRemainingSlots } from './rules';

/**
 * Modello di mercato dell'asta.
 *
 * Il "valore" di un giocatore è il suo surplus rispetto al giocatore di
 * rimpiazzo: il miglior giocatore del ruolo che resterebbe disponibile
 * dopo che tutta la domanda residua fosse soddisfatta. Il prezzo equo
 * è il surplus moltiplicato per un tasso di inflazione che deriva dal
 * rapporto tra crediti discrezionali della lega e surplus residuo:
 * si auto-corregge se la lega spende troppo o troppo poco.
 */

/**
 * Fotografia istantanea del mercato d'asta
 */
export interface MarketSnapshot {
  /** Domanda residua per ruolo: somma degli slot mancanti di tutte le squadre */
  demand: Record<PlayerRole, number>;
  /**
   * Valore di rimpiazzo per ruolo: baseValue del (demand_r + 1)-esimo miglior
   * giocatore del ruolo ancora in pool, 0 se non esiste
   */
  replacementValue: Record<PlayerRole, number>;
  /** Somma su tutte le squadre di max(0, crediti - slot rimanenti totali) */
  discretionaryMoney: number;
  /** Somma sui ruoli del surplus dei migliori `demand_r` giocatori di ogni ruolo */
  totalSurplusValue: number;
  /** discretionaryMoney / totalSurplusValue (0 se il denominatore è 0) */
  inflation: number;
  /** Massimo baseValue per ruolo nel pool residuo (0 se il ruolo è esaurito) */
  maxBaseValue: Record<PlayerRole, number>;
  /**
   * Surplus medio dei migliori `demand_r` giocatori del ruolo (0 se domanda nulla):
   * moltiplicato per l'inflazione è la spesa attesa per uno slot di quel ruolo
   */
  avgSurplus: Record<PlayerRole, number>;
}

/**
 * Costruisce lo snapshot di mercato dato lo stato di squadre e pool.
 * Il giocatore del lotto corrente resta nel pool finché il lotto non si chiude,
 * quindi gli snapshot durante un lotto lo includono ancora.
 */
export function buildMarketSnapshot(teams: Team[], pool: Player[]): MarketSnapshot {
  const demand: Record<PlayerRole, number> = { P: 0, D: 0, C: 0, A: 0 };
  let discretionaryMoney = 0;

  for (const team of teams) {
    const slots = getRemainingSlots(team);
    for (const role of ROLE_ORDER) {
      demand[role] += slots[role];
    }
    discretionaryMoney += Math.max(0, team.credits - getTotalRemainingSlots(team));
  }

  // Una sola passata sul pool: bucket dei baseValue per ruolo, poi sort
  const byRole: Record<PlayerRole, number[]> = { P: [], D: [], C: [], A: [] };
  for (const player of pool) {
    byRole[player.role].push(player.baseValue);
  }

  const replacementValue: Record<PlayerRole, number> = { P: 0, D: 0, C: 0, A: 0 };
  const maxBaseValue: Record<PlayerRole, number> = { P: 0, D: 0, C: 0, A: 0 };
  const avgSurplus: Record<PlayerRole, number> = { P: 0, D: 0, C: 0, A: 0 };
  let totalSurplusValue = 0;

  for (const role of ROLE_ORDER) {
    const sorted = byRole[role].sort((a, b) => b - a);

    maxBaseValue[role] = sorted[0] ?? 0;

    const replacement = demand[role] < sorted.length ? sorted[demand[role]] : 0;
    replacementValue[role] = replacement;

    const top = sorted.slice(0, demand[role]);
    let roleSurplus = 0;
    for (const value of top) {
      roleSurplus += Math.max(0, value - replacement);
    }
    totalSurplusValue += roleSurplus;
    avgSurplus[role] = top.length > 0 ? roleSurplus / top.length : 0;
  }

  const inflation = totalSurplusValue > 0 ? discretionaryMoney / totalSurplusValue : 0;

  return {
    demand,
    replacementValue,
    discretionaryMoney,
    totalSurplusValue,
    inflation,
    maxBaseValue,
    avgSurplus,
  };
}

/**
 * Spesa discrezionale attesa (oltre al credito minimo) per riempire gli
 * slot indicati ai prezzi medi correnti del mercato.
 */
export function getExpectedSpend(slots: Record<PlayerRole, number>, market: MarketSnapshot): number {
  let total = 0;
  for (const role of ROLE_ORDER) {
    total += Math.max(0, slots[role]) * market.inflation * market.avgSurplus[role];
  }
  return total;
}

/**
 * Surplus del giocatore rispetto al valore di rimpiazzo del suo ruolo
 */
export function getSurplusValue(player: Player, market: MarketSnapshot): number {
  return Math.max(0, player.baseValue - market.replacementValue[player.role]);
}

/**
 * Prezzo equo del giocatore: 1 + surplus * inflazione, arrotondato, minimo 1.
 */
export function getFairPrice(player: Player, market: MarketSnapshot): number {
  return Math.max(1, Math.round(1 + market.inflation * getSurplusValue(player, market)));
}
