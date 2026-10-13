import type { BotConfig, Player, PlayerRole, Team } from '../../types';
import { autoLineup, FORMATIONS, FORMATION_IDS } from '../../domain/teams/formations';
import { FORMATION_RATING_WEIGHTS, OVERALL_FLOOR, OVERALL_SPAN, playerQuality } from '../../domain/teams/teamStrength';
import { getTotalRemainingSlots } from './rules';
import type { ValuationContext } from './botValuation';

export const BENCH_VALUE = 0.35;
export const BENCH_EXPECTED_PRICE = 2;
export const BENCH_CAP_SHARE = 0.03;

export interface SquadPlan {
  formation: BotConfig['preferredFormation'];
  starterSlots: Record<PlayerRole, number>;
  starterNeed: Record<PlayerRole, number>;
  ownedStarters: Record<PlayerRole, number>;
  benchNeed: number;
  expectedSpend: number;
  budgetByRole: Record<PlayerRole, number>;
}

const ROLES: PlayerRole[] = ['P', 'D', 'C', 'A'];
const PLAN_BIAS = { normale: 0.4, difficile: 0.12 } as const;
const caches = new WeakMap<ValuationContext, Map<string, SquadPlan>>();

function roleCounts(formation: BotConfig['preferredFormation']): Record<PlayerRole, number> {
  return FORMATIONS[formation].layout.reduce<Record<PlayerRole, number>>((counts, slot) => {
    counts[slot.role]++;
    return counts;
  }, { P: 0, D: 0, C: 0, A: 0 });
}

function projectedRating(candidates: Record<PlayerRole, Player[]>, formation: BotConfig['preferredFormation']): number {
  const needed = roleCounts(formation);
  const weights = FORMATION_RATING_WEIGHTS[formation];
  const quality = ROLES.reduce((sum, role) => {
    const selected = candidates[role].slice(0, needed[role]);
    if (selected.length === 0) return sum;
    const mean = selected.reduce((total, player) => total + playerQuality(player), 0) / selected.length;
    return sum + weights[role] * mean * Math.sqrt(Math.min(1, selected.length / needed[role]));
  }, 0);
  return Math.round(OVERALL_FLOOR + OVERALL_SPAN * quality);
}

export function getSquadPlan(bot: Team, ctx: ValuationContext): SquadPlan {
  let byTeam = caches.get(ctx);
  if (!byTeam) {
    byTeam = new Map();
    caches.set(ctx, byTeam);
  }
  const cached = byTeam.get(bot.id);
  if (cached) return cached;

  const config = bot.botConfig;
  const difficulty = config?.difficulty ?? 'normale';
  const preferred = config?.preferredFormation ?? '2-3-2';
  const owned = bot.roster.map(item => item.player);
  const ownedIds = new Set(owned.map(player => player.id));
  const candidates = Object.fromEntries(ROLES.map(role => [
    role,
    [...owned, ...(ctx.pool ?? []).filter(player => player.role === role && !ownedIds.has(player.id))]
      .filter(player => player.role === role)
      .sort((a, b) => (b.overall ?? b.baseValue) - (a.overall ?? a.baseValue) || b.baseValue - a.baseValue),
  ])) as Record<PlayerRole, Player[]>;
  const scores = new Map(FORMATION_IDS.map(candidate => [
    candidate,
    projectedRating(candidates, candidate) + (candidate === preferred ? PLAN_BIAS[difficulty] * 25 : 0),
  ]));
  const formation = FORMATION_IDS.reduce((best, candidate) => scores.get(candidate)! > scores.get(best)! ? candidate : best, preferred);
  const starterSlots = roleCounts(formation);
  const ownedCounts: Record<PlayerRole, number> = { P: 0, D: 0, C: 0, A: 0 };
  for (const owned of bot.roster) ownedCounts[owned.player.role]++;
  const ownedStarters = Object.fromEntries(ROLES.map(role => [role, Math.min(starterSlots[role], ownedCounts[role])])) as Record<PlayerRole, number>;
  const starterNeed = Object.fromEntries(ROLES.map(role => [role, Math.max(0, starterSlots[role] - ownedStarters[role])])) as Record<PlayerRole, number>;
  const benchNeed = Math.max(0, getTotalRemainingSlots(bot) - ROLES.reduce((sum, role) => sum + starterNeed[role], 0));
  const roleExpected = Object.fromEntries(ROLES.map(role => [
    role,
    starterNeed[role] * ctx.market.inflation * ctx.market.avgSurplus[role],
  ])) as Record<PlayerRole, number>;
  const expectedSpend = ROLES.reduce((sum, role) => sum + roleExpected[role], 0) + benchNeed * BENCH_EXPECTED_PRICE;
  const discretionary = Math.max(0, bot.credits - getTotalRemainingSlots(bot));
  const weighted = ROLES.reduce((sum, role) => sum + roleExpected[role] + starterNeed[role] * (config?.rolePreferences[role] ?? 1), 0) || 1;
  const budgetByRole = Object.fromEntries(ROLES.map(role => [
    role,
    Math.round(discretionary * (roleExpected[role] + starterNeed[role] * (config?.rolePreferences[role] ?? 1)) / weighted),
  ])) as Record<PlayerRole, number>;
  const plan = { formation, starterSlots, starterNeed, ownedStarters, benchNeed, expectedSpend, budgetByRole };
  byTeam.set(bot.id, plan);
  return plan;
}

export function isStarterTarget(bot: Team, player: Player, ctx: ValuationContext): boolean {
  return getSquadPlan(bot, ctx).starterNeed[player.role] > 0;
}

export function hasOwnedLineup(roster: Player[], formation: BotConfig['preferredFormation']): boolean {
  return autoLineup(roster, formation).starters.every(Boolean);
}
