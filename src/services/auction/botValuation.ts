import { BotConfig, DifficultyLevel, Player, Team, TOTAL_ROSTER_SIZE } from '../../types';
import { ROLE_ORDER, getMaxBid, getRemainingSlots, getTotalRemainingSlots, needsRole } from './rules';
import { MarketSnapshot, getExpectedSpend, getFairPrice } from './market';
import { createRng, hashSeed } from './rng';
import { ARCHETYPE_PROFILES, MAX_SOFT_CAP_SHARE } from './personalities';

/**
 * Valutazione dei bot: quanto è disposto a spendere un bot per un giocatore.
 *
 * Il limite combina il prezzo equo di mercato con il profilo di difficoltà,
 * la personalità del bot (archetipo, preferenze di ruolo, pupilli), la
 * ricchezza relativa e un rumore deterministico legato al seme del lotto:
 * a parità di stato e seme il limite è sempre lo stesso (niente "re-roll").
 */

/**
 * Parametri che definiscono la forza di un livello di difficoltà
 */
export interface DifficultyProfile {
  /** Quanto il bot tiene conto del prezzo equo di mercato */
  valueFactor: number;
  /** Ampiezza del rumore deterministico sul limite (±noise) */
  noise: number;
  /** Quanto la ricchezza relativa influenza la spesa (esponente) */
  wealthSensitivity: number;
  /** Temperatura del softmax di chiamata (più bassa = scelte più nette) */
  callTemperature: number;
  /** Peso della strategia "drain" (chiamare per far spendere gli avversari) */
  drainWeight: number;
  /**
   * Quanto pesano le deviazioni di personalità (moltiplicatore di valore e
   * affinità per i top): 1 = piene, 0 = bot neutro e più razionale
   */
  personalityWeight: number;
}

/**
 * Profili di difficoltà dei bot
 */
export const DIFFICULTY_PROFILES: Record<DifficultyLevel, DifficultyProfile> = {
  normale: {
    valueFactor: 1.1,
    noise: 0.2,
    wealthSensitivity: 0.75,
    callTemperature: 0.25,
    drainWeight: 0.9,
    personalityWeight: 1,
  },
  difficile: {
    valueFactor: 1.05,
    noise: 0.05,
    wealthSensitivity: 1.0,
    callTemperature: 0.08,
    drainWeight: 0.9,
    personalityWeight: 0.3,
  },
};

/** Sui pupilli il bot tiene da parte solo questa frazione della riserva abituale */
export const PUPILLO_PACING_FACTOR = 0.5;

/**
 * Contesto di valutazione: squadre e snapshot di mercato correnti
 */
export interface ValuationContext {
  teams: Team[];
  market: MarketSnapshot;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Fattore "top player": quanto l'archetipo premia i giocatori di valore
 * assoluto rispetto ai medi. rel è la posizione del giocatore nel suo
 * ruolo (baseValue / maxBaseValue del pool residuo): 1 per il top.
 */
export function getStarFactor(config: BotConfig, player: Player, market: MarketSnapshot): number {
  const max = market.maxBaseValue[player.role];
  if (max <= 0) return 1;
  const rel = player.baseValue / max;
  const weight = DIFFICULTY_PROFILES[config.difficulty].personalityWeight;
  return 1 + weight * ARCHETYPE_PROFILES[config.archetype].starAffinity * (2 * rel - 1);
}

/**
 * Ricchezza relativa della squadra: crediti discrezionali per slot
 * rispetto alla media della lega. 1 se la media è nulla o la squadra
 * non ha slot da riempire.
 */
/**
 * Cache per contesto di valutazione: i ValuationContext sono creati una
 * volta per lotto/chiamata e poi gettati, quindi somma degli slot di lega,
 * aggiustamenti di ricchezza e tetti rivali sono riusabili tra i bot e i
 * candidati di una stessa valutazione.
 */
interface ValuationCache {
  leagueSlots?: number;
  wealthAdj: Map<string, number>;
  rivalCap: Map<string, number>;
  pacingSpend: Map<string, number>;
}
const valuationCaches = new WeakMap<ValuationContext, ValuationCache>();

function ctxCache(ctx: ValuationContext): ValuationCache {
  let c = valuationCaches.get(ctx);
  if (!c) {
    c = { wealthAdj: new Map(), rivalCap: new Map(), pacingSpend: new Map() };
    valuationCaches.set(ctx, c);
  }
  return c;
}

function getLeagueSlots(ctx: ValuationContext): number {
  const c = ctxCache(ctx);
  if (c.leagueSlots === undefined) {
    let total = 0;
    for (const t of ctx.teams) {
      total += getTotalRemainingSlots(t);
    }
    c.leagueSlots = total;
  }
  return c.leagueSlots;
}

export function getWealthRatio(team: Team, ctx: ValuationContext): number {
  const teamSlots = getTotalRemainingSlots(team);
  if (teamSlots <= 0) return 1;
  const leagueSlots = getLeagueSlots(ctx);
  const leaguePerSlot = leagueSlots > 0 ? ctx.market.discretionaryMoney / leagueSlots : 0;
  if (leaguePerSlot <= 0) return 1;
  const teamDiscretionary = Math.max(0, team.credits - teamSlots);
  return (teamDiscretionary / teamSlots) / leaguePerSlot;
}

/** Aggiustamento di ricchezza, memoizzato per (contesto, squadra, esponente) */
function getWealthAdj(team: Team, ctx: ValuationContext, sensitivity: number): number {
  const c = ctxCache(ctx);
  const key = `${team.id}:${sensitivity}`;
  const cached = c.wealthAdj.get(key);
  if (cached !== undefined) return cached;
  const value = clamp(Math.pow(getWealthRatio(team, ctx), sensitivity), 0.5, 1.6);
  c.wealthAdj.set(key, value);
  return value;
}

/** Tetto rivali per (contesto, bot, ruolo): max bid dei rivali che necessitano il ruolo + 1 */
function getRivalCap(bot: Team, role: Player['role'], ctx: ValuationContext): number {
  const c = ctxCache(ctx);
  const key = `${bot.id}:${role}`;
  const cached = c.rivalCap.get(key);
  if (cached !== undefined) return cached;
  const rivals = ctx.teams.filter(
    t => t.id !== bot.id && needsRole(t, role)
  );
  const value = rivals.length > 0 ? Math.max(...rivals.map(getMaxBid)) + 1 : 1;
  c.rivalCap.set(key, value);
  return value;
}

/**
 * Limite di spesa del bot per il giocatore.
 *
 * Restituisce 0 se il bot non ha botConfig o non ha bisogno del ruolo.
 * Altrimenti è il minimo tra:
 *  - valutazione grezza: fair × valueFactor × archetipo × pupillo ×
 *    preferenza ruolo × starFactor × ricchezza × rumore
 *  - softCap: 1 + share × (crediti - slot), share = pupilloMaxShare se
 *    il giocatore è un pupillo altrimenti maxShareOfBudget (se slot > 1)
 *  - rivalCap: max bid dei rivali che necessitano il ruolo + 1 (1 se nessuno)
 *  - getMaxBid del bot (vincolo di budget regolamentare)
 *
 * Deterministico a parità di (stato, lotSeed): il rumore deriva dal seme.
 */
export function getBotLimit(
  bot: Team,
  player: Player,
  ctx: ValuationContext,
  lotSeed?: number
): number {
  const config = bot.botConfig;
  if (!config || !needsRole(bot, player.role)) return 0;

  const profile = DIFFICULTY_PROFILES[config.difficulty];
  const archetype = ARCHETYPE_PROFILES[config.archetype];
  const fair = getFairPrice(player, ctx.market);
  const wealthAdj = getWealthAdj(bot, ctx, profile.wealthSensitivity);
  const isPupillo = config.pupilli.includes(player.id);
  const rolePref = clamp(config.rolePreferences[player.role], 0.88, 1.12);
  const starFactor = getStarFactor(config, player, ctx.market);

  let noise = 1;
  if (lotSeed !== undefined) {
    const u = createRng(hashSeed(lotSeed, bot.id))();
    noise = 1 + profile.noise * (2 * u - 1);
  }

  const raw =
    fair *
    profile.valueFactor *
    (1 + profile.personalityWeight * (archetype.valueMultiplier - 1)) *
    (isPupillo ? archetype.pupilloMultiplier : 1) *
    rolePref *
    starFactor *
    wealthAdj *
    noise;

  const slots = getTotalRemainingSlots(bot);
  const baseShare = isPupillo ? archetype.pupilloMaxShare : archetype.maxShareOfBudget;
  // Il soft cap si allenta man mano che la rosa si riempie: con 8 slot
  // vale la quota dell'archetipo, con 2 slot quasi tutto il budget libero
  // (la riserva per l'ultimo slot la garantisce già il pacingCap)
  const fillProgress = 1 - (slots - 1) / (TOTAL_ROSTER_SIZE - 1);
  const share = Math.min(
    MAX_SOFT_CAP_SHARE,
    baseShare * config.rolePreferences[player.role] + (1 - baseShare) * fillProgress
  );
  const softCap = slots > 1 ? 1 + share * (bot.credits - slots) : Infinity;

  // Piano di spesa: tiene da parte una quota della spesa attesa per gli
  // altri slot (ai prezzi medi correnti), pesata dalle preferenze di ruolo.
  // La spesa attesa è fissa per (contesto, bot, ruolo): memoizzata.
  const spendKey = `${bot.id}:${player.role}`;
  const cache = ctxCache(ctx);
  let expectedSpend = cache.pacingSpend.get(spendKey);
  if (expectedSpend === undefined) {
    const otherSlots = getRemainingSlots(bot);
    otherSlots[player.role]--;
    // Il reparto del giocatore in asta non è pesato: la preferenza non deve
    // far risparmiare il bot contro sé stesso nel suo reparto focus
    for (const role of ROLE_ORDER) {
      if (role !== player.role) otherSlots[role] *= config.rolePreferences[role];
    }
    expectedSpend = getExpectedSpend(otherSlots, ctx.market);
    cache.pacingSpend.set(spendKey, expectedSpend);
  }
  const pacingCap =
    1 +
    (bot.credits - slots) -
    archetype.pacingReserve *
      (isPupillo ? PUPILLO_PACING_FACTOR : 1) *
      expectedSpend;

  const rivalCap = getRivalCap(bot, player.role, ctx);

  return Math.max(
    1,
    Math.floor(Math.min(raw, softCap, pacingCap, rivalCap, getMaxBid(bot)))
  );
}

/**
 * Componenti del limite di un rivale indipendenti dal giocatore
 * (per un ruolo fissato): precalcolabili una sola volta per chiamata.
 */
export interface RivalLimitFactors {
  /** False se la squadra non ha bisogno del ruolo (limite 0) */
  active: boolean;
  wealthAdj: number;
  softCap: number;
  maxBid: number;
}

/**
 * Precalcola i fattori del limite di un rivale per un ruolo.
 * Il limite su un giocatore è poi applyRivalLimitFactors(fattori, player, market).
 */
export function rivalLimitFactors(
  team: Team,
  role: Player['role'],
  ctx: ValuationContext
): RivalLimitFactors {
  const slots = getTotalRemainingSlots(team);
  return {
    active: needsRole(team, role),
    wealthAdj: getWealthAdj(team, ctx, 0.5),
    softCap: slots > 1 ? 1 + 0.5 * (team.credits - slots) : Infinity,
    maxBid: getMaxBid(team),
  };
}

/** Limite stimato di un rivale su un giocatore, dati i fattori precalcolati */
export function applyRivalLimitFactors(
  factors: RivalLimitFactors,
  player: Player,
  market: MarketSnapshot
): number {
  if (!factors.active) return 0;
  const fair = getFairPrice(player, market);
  return Math.max(
    1,
    Math.floor(Math.min(fair * factors.wealthAdj, factors.softCap, factors.maxBid))
  );
}

/**
 * Stima neutra del limite di un'altra squadra (senza personalità né rumore).
 * Usata dal chiamante per prevedere il comportamento dei rivali;
 * funziona anche per la squadra dell'utente.
 */
export function estimateRivalLimit(
  team: Team,
  player: Player,
  ctx: ValuationContext
): number {
  return applyRivalLimitFactors(
    rivalLimitFactors(team, player.role, ctx),
    player,
    ctx.market
  );
}
