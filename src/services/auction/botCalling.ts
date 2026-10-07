import { Player, PlayerRole, Team } from '../../types';
import { getMaxBid, needsRole } from './rules';
import { Rng, pickWeighted } from './rng';
import { MarketSnapshot, getFairPrice } from './market';
import {
  DIFFICULTY_PROFILES,
  ValuationContext,
  applyRivalLimitFactors,
  rivalLimitFactors,
  getBotLimit,
} from './botValuation';
import { ARCHETYPE_PROFILES } from './personalities';

/**
 * Chiamata dei bot: scelta del giocatore da mettere all'asta.
 *
 * Per ogni candidato il bot stima i limiti dei rivali e decide se
 * chiamare per vincere (value / budget_fill) oppure per far spendere
 * gli avversari (drain). La scelta finale usa un softmax sul punteggio
 * con temperatura dipendente dalla difficoltà.
 */

/** Peso del valore nominale del giocatore nel punteggio delle chiamate "da vincere" */
export const QUALITY_WEIGHT = 0.3;

/** Frazione della spesa provocata che conta nel punteggio delle chiamate "drain" */
export const DRAIN_SCORE_FACTOR = 0.5;

/** Se il miglior limite rivale è sotto questa soglia, la vittoria è quasi gratuita */
export const FREE_WIN_LIMIT = 2;

/** Prezzo atteso massimo perché una chiamata sia considerata "riempi-budget" */
export const BUDGET_FILL_MAX_PRICE = 2;

/** Prezzo equo massimo perché una chiamata sia considerata "riempi-budget" */
export const BUDGET_FILL_MAX_FAIR = 3;

/** Bonus allo score quando il candidato vincente è un pupillo del bot */
export const PUPILLO_CALL_BONUS = 5;

/**
 * Strategia con cui il bot ha scelto il giocatore
 */
export type CallStrategy =
  | 'free_pick'    // Nessun rivale può contrastare: prendo il migliore a 1
  | 'value'        // Chiamata per vincere un giocatore di valore
  | 'pupillo'      // Chiamata per vincere un pupillo
  | 'drain'        // Chiamata per far spendere gli avversari
  | 'budget_fill'; // Chiamata di ripiego / a costo minimo

/**
 * Esito della chiamata di un bot
 */
export interface CallDecision {
  /** Giocatore chiamato */
  player: Player;
  /** Strategia adottata */
  strategy: CallStrategy;
  /** Punteggio interno della scelta */
  score: number;
}

interface ScoredCandidate {
  player: Player;
  strategy: CallStrategy;
  score: number;
}

/**
 * Sceglie il giocatore che il bot chiama per il ruolo corrente.
 * Restituisce null se non ci sono giocatori del ruolo in pool o se
 * il bot non ha botConfig.
 */
export function chooseBotCall(
  bot: Team,
  role: PlayerRole,
  ctx: ValuationContext & { pool: Player[] },
  rng: Rng
): CallDecision | null {
  const config = bot.botConfig;
  const candidates = ctx.pool
    .filter(player => player.role === role)
    .sort((a, b) => b.baseValue - a.baseValue);
  if (candidates.length === 0 || !config) return null;

  const profile = DIFFICULTY_PROFILES[config.difficulty];
  const archetype = ARCHETYPE_PROFILES[config.archetype];
  const market: MarketSnapshot = ctx.market;

  // Rivali (incluso l'utente) che hanno bisogno del ruolo e possono rilanciare.
  // I fattori del loro limite sono fissi per l'intera valutazione: si
  // precalcolano una volta sola invece che per ogni candidato.
  const rivals = ctx.teams.filter(
    t => t.id !== bot.id && needsRole(t, role) && getMaxBid(t) > 1
  );
  const rivalFactors = rivals.map(rival => rivalLimitFactors(rival, role, ctx));

  // Senza rivali credibili il bot prende il migliore a 1 credito
  if (rivals.length === 0) {
    return { player: candidates[0], strategy: 'free_pick', score: Infinity };
  }

  interface Evaluated {
    candidate: ScoredCandidate | null;
    player: Player;
    top: number;
    myLimit: number;
  }

  const evaluated: Evaluated[] = candidates.map(player => {
    const myLimit = getBotLimit(bot, player, ctx);
    const rivalLimits = rivalFactors
      .map(factors => applyRivalLimitFactors(factors, player, market))
      .sort((a, b) => b - a);
    const top = rivalLimits[0] ?? 0;
    const second = rivalLimits[1] ?? 0;
    const fair = getFairPrice(player, market);

    const win = top < FREE_WIN_LIMIT || myLimit > top;
    if (win) {
      const expectedPrice = top < FREE_WIN_LIMIT ? 1 : Math.min(myLimit, top + 1);
      let score = (myLimit - expectedPrice) + QUALITY_WEIGHT * fair;
      let strategy: CallStrategy =
        expectedPrice <= BUDGET_FILL_MAX_PRICE && fair <= BUDGET_FILL_MAX_FAIR
          ? 'budget_fill'
          : 'value';
      if (strategy === 'budget_fill') {
        score += archetype.budgetFillBonus;
      }
      if (config.pupilli.includes(player.id)) {
        score += PUPILLO_CALL_BONUS;
        strategy = 'pupillo';
      }
      return { candidate: { player, strategy, score }, player, top, myLimit };
    }

    // Non posso vincere: valuto la strategia di drain, se prevista dalla difficoltà
    if (profile.drainWeight > 0) {
      const drainSpend = Math.min(top, Math.max(myLimit, second) + 1);
      const score = profile.drainWeight * archetype.drainWeightMult * DRAIN_SCORE_FACTOR * drainSpend;
      return { candidate: { player, strategy: 'drain', score }, player, top, myLimit };
    }

    return { candidate: null, player, top, myLimit };
  });

  const scorable = evaluated
    .map(e => e.candidate)
    .filter((c): c is ScoredCandidate => c !== null);

  if (scorable.length > 0) {
    const maxScore = Math.max(...scorable.map(c => c.score));
    const temperature = profile.callTemperature * Math.max(1, maxScore);
    const weights = scorable.map(c => Math.exp((c.score - maxScore) / temperature));
    const chosen = pickWeighted(scorable, weights, rng);
    return { player: chosen.player, strategy: chosen.strategy, score: chosen.score };
  }

  // Fallback: nessun candidato scorabile — minimizzo il distacco dai rivali,
  // a parità di distacco preferisco il giocatore di valore più alto
  let fallback = evaluated[0];
  for (const e of evaluated) {
    const gap = e.top - e.myLimit;
    const bestGap = fallback.top - fallback.myLimit;
    if (gap < bestGap || (gap === bestGap && e.player.baseValue > fallback.player.baseValue)) {
      fallback = e;
    }
  }
  return { player: fallback.player, strategy: 'budget_fill', score: 0 };
}
