import type { CatalogKey } from '../i18n/translate';

/**
 * Fasce dell'overall delle card (dati storici: 73-95, mediana 82).
 * Logica condivisa tra UI e card condivisibile.
 */
export type Tier = 'bronze' | 'silver' | 'gold' | 'elite';

export const TIER_THRESHOLDS = { silver: 80, gold: 85, elite: 90 } as const;

export function tierOf(overall: number): Tier {
  if (overall >= TIER_THRESHOLDS.elite) return 'elite';
  if (overall >= TIER_THRESHOLDS.gold) return 'gold';
  if (overall >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

/** Chiavi di catalogo per l'etichetta della fascia */
export const TIER_KEY: Record<Tier, CatalogKey> = {
  bronze: 'ui.tiers.bronze',
  silver: 'ui.tiers.silver',
  gold: 'ui.tiers.gold',
  elite: 'ui.tiers.elite',
};

/** Colori fissi delle fasce (fondo, testo), uguali a tailwind `tier-*` */
export const TIER_COLORS: Record<Tier, { bg: string; ink: string }> = {
  bronze: { bg: '#D9A577', ink: '#5E3410' },
  silver: { bg: '#D5DADD', ink: '#3F474C' },
  gold: { bg: '#F4CF55', ink: '#5A4300' },
  elite: { bg: '#15201A', ink: '#FFD23F' },
};
