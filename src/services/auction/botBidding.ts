import { AuctionLot, Team } from '../../types';
import { needsRole } from './rules';
import { Rng, pickWeighted } from './rng';
import { ValuationContext, getBotLimit } from './botValuation';
import { ARCHETYPE_PROFILES } from './personalities';

/**
 * Decisioni di rilancio dei bot durante un lotto.
 */

/**
 * Offerta decisa da un bot
 */
export interface BotBid {
  /** ID della squadra che rilancia */
  teamId: string;
  /** Importo dell'offerta */
  amount: number;
  /** Limite massimo che il bot è disposto a spendere per questo lotto */
  limit: number;
}

/** Incremento standard del bot come frazione dell'offerta attuale (invariante di scala rispetto al budget) */
export const STANDARD_INCREMENT_RATE = 0.05;

/**
 * Quota del distacco (limite - offerta) usata come incremento minimo:
 * a inizio lotto, lontano dal limite, i bot salgono più in fretta
 */
export const GAP_INCREMENT_RATE = 0.2;

/** Soglia minima di distacco dal limite per considerare un rilancio a salto */
const JUMP_MIN_GAP = 10;

/** Il rilancio a salto è considerato solo sotto questa frazione del limite */
const JUMP_MAX_BID_FRACTION = 0.5;

/** Intervallo frazionario del gap coperto da un rilancio a salto */
const JUMP_GAP_RANGE: [number, number] = [0.15, 0.3];

/**
 * Decide se e quanto il bot rilancia sul lotto corrente.
 * Restituisce null se il bot è già il miglior offerente, se non ha
 * bisogno del ruolo o se il suo limite non supera l'offerta attuale.
 * Il limite è deterministico per (stato, lot.seed): niente re-roll.
 */
export function decideBotBid(
  bot: Team,
  lot: AuctionLot,
  ctx: ValuationContext,
  rng: Rng
): BotBid | null {
  if (bot.id === lot.currentBidderId) return null;
  if (!needsRole(bot, lot.player.role)) return null;

  const limit = getBotLimit(bot, lot.player, ctx, lot.seed);
  if (limit <= lot.currentBid) return null;

  let increment = Math.max(
    1,
    Math.round(lot.currentBid * STANDARD_INCREMENT_RATE),
    Math.floor((limit - lot.currentBid) * GAP_INCREMENT_RATE)
  );
  const config = bot.botConfig;
  const archetype = config ? ARCHETYPE_PROFILES[config.archetype] : null;
  const isPupillo = config ? config.pupilli.includes(lot.player.id) : false;
  const jumpProbability = archetype
    ? (isPupillo ? archetype.pupilloJumpBidProbability : archetype.jumpBidProbability)
    : 0;
  const gap = limit - lot.currentBid;
  if (
    jumpProbability > 0 &&
    rng() < jumpProbability &&
    gap >= JUMP_MIN_GAP &&
    lot.currentBid < JUMP_MAX_BID_FRACTION * limit
  ) {
    const fraction = JUMP_GAP_RANGE[0] + rng() * (JUMP_GAP_RANGE[1] - JUMP_GAP_RANGE[0]);
    increment = Math.max(2, Math.round(gap * fraction));
  }

  return { teamId: bot.id, amount: Math.min(lot.currentBid + increment, limit), limit };
}

/**
 * Sceglie quale bot rilancia, tra quelli disposti a farlo.
 * La probabilità di ciascun bot è proporzionale a (limite - offerta attuale):
 * chi vuole il giocatore di più tende a rilanciare prima.
 * Restituisce null se nessun bot vuole rilanciare.
 */
export function chooseBotResponder(
  bots: Team[],
  lot: AuctionLot,
  ctx: ValuationContext,
  rng: Rng
): BotBid | null {
  const decisions: BotBid[] = [];
  for (const bot of bots) {
    const decision = decideBotBid(bot, lot, ctx, rng);
    if (decision) decisions.push(decision);
  }
  if (decisions.length === 0) return null;
  const weights = decisions.map(d => d.limit - lot.currentBid);
  return pickWeighted(decisions, weights, rng);
}
