/**
 * API pubblica del motore d'asta.
 */

export type { Rng } from './rng';
export { createRng, hashSeed, pickWeighted, shuffle } from './rng';

export {
  ROLE_ORDER,
  LOT_DURATION_MS,
  OPENING_BID,
  LEAGUE_SIZE,
  INITIAL_CREDITS,
  LISTONE_FACTOR,
  buildAuctionPool,
  getRemainingSlots,
  getTotalRemainingSlots,
  needsRole,
  getMaxBid,
  canBid,
  getCurrentRole,
  getNextCallerIndex,
  getMaxSupportedTeams,
} from './rules';

export type { MarketSnapshot } from './market';
export { buildMarketSnapshot, getSurplusValue, getFairPrice } from './market';

export type { ArchetypeProfile } from './personalities';
export {
  ARCHETYPE_PROFILES,
  assignArchetypes,
  pickPupilli,
  randomRolePreferences,
} from './personalities';

export type { DifficultyProfile, ValuationContext } from './botValuation';
export {
  DIFFICULTY_PROFILES,
  getStarFactor,
  getWealthRatio,
  getBotLimit,
  estimateRivalLimit,
} from './botValuation';

export type { BidTimingMode } from './botTiming';
export {
  MIN_REACTION_MS,
  FAST_MAX_MS,
  SNIPE_WINDOW_MS,
  SNIPE_SAFETY_MS,
  planBotBidDelay,
  planBotCallDelay,
  lotClockStep,
} from './botTiming';

export type { BotBid } from './botBidding';
export { decideBotBid, chooseBotResponder } from './botBidding';

export type { CallStrategy, CallDecision } from './botCalling';
export {
  QUALITY_WEIGHT,
  DRAIN_SCORE_FACTOR,
  FREE_WIN_LIMIT,
  BUDGET_FILL_MAX_PRICE,
  BUDGET_FILL_MAX_FAIR,
  PUPILLO_CALL_BONUS,
  chooseBotCall,
} from './botCalling';

export type { AuctionAction, AuctionWorld } from './session';
export { createInitialAuctionState, getCurrentCallerId, auctionReducer } from './session';

export type { RunOptions } from './simulator';
export { AUTOPILOT_BOT_CONFIG, runAuction } from './simulator';
