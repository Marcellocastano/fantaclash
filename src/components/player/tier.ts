import { Player, PlayerRole } from '../../types';
import { playerOverall } from '../../services/auction/teamStrength';
import { tierOf, Tier } from '../../services/playerTier';

export { tierOf, TIER_LABEL, TIER_THRESHOLDS } from '../../services/playerTier';
export type { Tier } from '../../services/playerTier';

export function playerTier(player: Player): Tier {
  return tierOf(playerOverall(player));
}

/** Classi scritte per intero (Tailwind non legge nomi composti a runtime) */
export const TIER_CLASSES: Record<Tier, { bg: string; ink: string; muted: string; border: string }> = {
  bronze: { bg: 'bg-tier-bronze-bg', ink: 'text-tier-bronze-ink', muted: 'text-tier-bronze-ink', border: 'border-tier-bronze-ink' },
  silver: { bg: 'bg-tier-silver-bg', ink: 'text-tier-silver-ink', muted: 'text-tier-silver-ink', border: 'border-tier-silver-ink' },
  gold: { bg: 'bg-tier-gold-bg', ink: 'text-tier-gold-ink', muted: 'text-tier-gold-ink', border: 'border-tier-gold-ink' },
  elite: { bg: 'bg-tier-elite-bg', ink: 'text-tier-elite-ink', muted: 'text-canvas/80', border: 'border-tier-elite-ink' },
};

export const ROLE_TAG: Record<PlayerRole, string> = {
  P: 'role-tag role-tag-P',
  D: 'role-tag role-tag-D',
  C: 'role-tag role-tag-C',
  A: 'role-tag role-tag-A',
};

export const ROLE_NAME: Record<PlayerRole, string> = {
  P: 'Portiere',
  D: 'Difensore',
  C: 'Centrocampista',
  A: 'Attaccante',
};
