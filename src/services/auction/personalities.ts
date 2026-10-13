import { BotArchetype, Player, PlayerRole } from '../../types';
import type { FormationId } from '../../domain/teams/formations';
import { Rng, shuffle } from './rng';

/**
 * Personalità dei bot: ogni bot ha un archetipo che modula valutazione,
 * strategia di chiamata, rilanci a salto e tempi di reazione.
 * I valori numerici sono centralizzati qui in un'unica tabella.
 */

/**
 * Parametri di un archetipo bot
 */
export interface ArchetypeProfile {
  /** Etichetta italiana per la UI */
  label: string;
  /** Moltiplicatore sulla valutazione del giocatore */
  valueMultiplier: number;
  /** Moltiplicatore extra sui pupilli */
  pupilloMultiplier: number;
  /** Soft cap: quota dei crediti discrezionali su un giocatore (se slot > 1) */
  maxShareOfBudget: number;
  /** Soft cap sui pupilli */
  pupilloMaxShare: number;
  /** Affinità per i top player: starFactor = 1 + starAffinity * (2*rel - 1) */
  starAffinity: number;
  /** Moltiplicatore del peso "drain" nelle chiamate */
  drainWeightMult: number;
  /**
   * Quota della spesa attesa per gli altri slot che il bot tiene da parte
   * (gestione del budget nel tempo; 0 = nessuna riserva)
   */
  pacingReserve: number;
  /** Crediti aggiunti allo score delle chiamate budget_fill */
  budgetFillBonus: number;
  /** Probabilità di rilancio a salto */
  jumpBidProbability: number;
  /** Probabilità di rilancio a salto su un pupillo */
  pupilloJumpBidProbability: number;
  /** Tempi di reazione */
  timing: {
    /** Peso della reazione rapida nelle offerte */
    fastness: number;
    /** Peso base della strategia "ultimo istante" (snipe) */
    snipeBase: number;
    /** Intervallo [min, max] ms prima di una chiamata */
    callDelayMs: [number, number];
  };
}

/**
 * Profili degli archetipi bot
 */
export const ARCHETYPE_PROFILES: Record<BotArchetype, ArchetypeProfile> = {
  aggressivo: {
    label: 'Aggressivo',
    valueMultiplier: 1.12,
    pupilloMultiplier: 1,
    maxShareOfBudget: 0.70,
    pupilloMaxShare: 0.70,
    starAffinity: 0.15,
    drainWeightMult: 0.3,
    pacingReserve: 0.3,
    budgetFillBonus: 0,
    jumpBidProbability: 0.35,
    pupilloJumpBidProbability: 0.35,
    timing: { fastness: 1.0, snipeBase: 0.05, callDelayMs: [1000, 2000] },
  },
  parsimonioso: {
    label: 'Parsimonioso',
    valueMultiplier: 0.6,
    pupilloMultiplier: 1,
    maxShareOfBudget: 0.40,
    pupilloMaxShare: 0.40,
    starAffinity: -0.15,
    drainWeightMult: 0.4,
    pacingReserve: 0.5,
    budgetFillBonus: 2,
    jumpBidProbability: 0.05,
    pupilloJumpBidProbability: 0.05,
    timing: { fastness: 0.4, snipeBase: 0.10, callDelayMs: [1500, 3000] },
  },
  stratega: {
    label: 'Stratega',
    valueMultiplier: 1.00,
    pupilloMultiplier: 1,
    maxShareOfBudget: 0.55,
    pupilloMaxShare: 0.55,
    starAffinity: 0,
    drainWeightMult: 2.5,
    pacingReserve: 0.4,
    budgetFillBonus: 0,
    jumpBidProbability: 0.20,
    pupilloJumpBidProbability: 0.20,
    timing: { fastness: 0.5, snipeBase: 0.30, callDelayMs: [2000, 3500] },
  },
  cacciatore: {
    label: 'Cacciatore di pupilli',
    valueMultiplier: 0.97,
    pupilloMultiplier: 2,
    maxShareOfBudget: 0.60,
    pupilloMaxShare: 0.75,
    starAffinity: 0,
    drainWeightMult: 0.6,
    pacingReserve: 0.35,
    budgetFillBonus: 0,
    jumpBidProbability: 0.10,
    pupilloJumpBidProbability: 0.25,
    timing: { fastness: 0.7, snipeBase: 0.10, callDelayMs: [1000, 2500] },
  },
  equilibrato: {
    label: 'Equilibrato',
    valueMultiplier: 1.00,
    pupilloMultiplier: 1,
    maxShareOfBudget: 0.55,
    pupilloMaxShare: 0.55,
    starAffinity: 0,
    drainWeightMult: 0.6,
    pacingReserve: 0.4,
    budgetFillBonus: 0,
    jumpBidProbability: 0.10,
    pupilloJumpBidProbability: 0.10,
    timing: { fastness: 0.6, snipeBase: 0.12, callDelayMs: [1200, 2800] },
  },
};

/** Tutti gli archetipi, in ordine fisso */
const ALL_ARCHETYPES: BotArchetype[] = [
  'aggressivo',
  'parsimonioso',
  'stratega',
  'cacciatore',
  'equilibrato',
];

/**
 * Assegna gli archetipi a `count` bot: prima una copia mescolata di tutti
 * gli archetipi disponibili, poi estrazioni casuali per i posti restanti.
 * Deterministico con un rng seedato.
 */
export function assignArchetypes(count: number, rng: Rng): BotArchetype[] {
  const shuffled = shuffle(ALL_ARCHETYPES, rng);
  const result: BotArchetype[] = [];
  for (let i = 0; i < count; i++) {
    result.push(
      i < shuffled.length
        ? shuffled[i]
        : ALL_ARCHETYPES[Math.floor(rng() * ALL_ARCHETYPES.length)]
    );
  }
  return result;
}

/**
 * Sceglie i pupilli di un cacciatore: un top player (top 10% del pool per
 * baseValue) e 1-2 giocatori della fascia 20%-60%. ID distinti, ordinamento
 * deterministico (baseValue desc, poi id).
 */
export function pickPupilli(pool: Player[], rng: Rng): string[] {
  const sorted = [...pool].sort(
    (a, b) => b.baseValue - a.baseValue || a.id.localeCompare(b.id)
  );
  if (sorted.length === 0) return [];

  const topCount = Math.max(1, Math.ceil(sorted.length * 0.1));
  const top = sorted.slice(0, topCount);
  const midStart = Math.min(sorted.length, Math.floor(sorted.length * 0.2));
  const midEnd = Math.min(sorted.length, Math.ceil(sorted.length * 0.6));
  const mid = sorted.slice(midStart, midEnd);

  const pupilli: string[] = [top[Math.floor(rng() * top.length)].id];
  const extraCount = 1 + Math.floor(rng() * 2); // 1 o 2
  const midShuffled = shuffle(mid, rng);
  for (const p of midShuffled) {
    if (pupilli.length >= 1 + extraCount) break;
    if (!pupilli.includes(p.id)) pupilli.push(p.id);
  }
  return pupilli;
}

export const FORMATION_PREFERENCES: Record<BotArchetype, Partial<Record<FormationId, number>>> = {
  aggressivo: { '2-2-3': 0.4, '3-1-3': 0.35, '2-3-2': 0.25 },
  parsimonioso: { '3-2-2': 0.4, '3-3-1': 0.3, '2-3-2': 0.3 },
  stratega: { '2-4-1': 0.35, '3-3-1': 0.35, '2-3-2': 0.3 },
  cacciatore: { '2-3-2': 1 / 6, '3-2-2': 1 / 6, '2-2-3': 1 / 6, '3-3-1': 1 / 6, '2-4-1': 1 / 6, '3-1-3': 1 / 6 },
  equilibrato: { '2-3-2': 0.5, '3-2-2': 0.1, '2-2-3': 0.1, '3-3-1': 0.1, '2-4-1': 0.1, '3-1-3': 0.1 },
};

export function preferredFormationFor(archetype: BotArchetype, rng: Rng): FormationId {
  const preferences = Object.entries(FORMATION_PREFERENCES[archetype]) as [FormationId, number][];
  let roll = rng();
  for (const [formation, weight] of preferences) {
    roll -= weight;
    if (roll < 0) return formation;
  }
  return preferences[preferences.length - 1][0];
}

export function randomRolePreferences(rng: Rng): Record<PlayerRole, number> {
  return {
    P: 0.88 + rng() * 0.24,
    D: 0.88 + rng() * 0.24,
    C: 0.88 + rng() * 0.24,
    A: 0.88 + rng() * 0.24,
  };
}

/** Quota massima di budget concessa al soft cap anche per il reparto focus */
export const MAX_SOFT_CAP_SHARE = 0.95;
