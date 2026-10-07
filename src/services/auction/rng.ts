/**
 * Utilità di casualità deterministica per il motore d'asta.
 * Tutte le decisioni dei bot passano da un Rng esplicito, così
 * simulazioni e test sono riproducibili a parità di seme.
 */

/**
 * Generatore di numeri pseudo-casuali in [0, 1)
 */
export type Rng = () => number;

/**
 * Crea un Rng deterministico (algoritmo mulberry32)
 * @param seed Seme numerico a 32 bit
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Combina più parti in un seme a 32 bit (hash FNV-1a sulla stringa joinata con '|')
 */
export function hashSeed(...parts: (string | number)[]): number {
  const str = parts.join('|');
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Estrae un elemento con probabilità proporzionale ai pesi.
 * I pesi <= 0 vengono ignorati; se tutti i pesi sono <= 0 estrae uniformemente.
 */
export function pickWeighted<T>(items: T[], weights: number[], rng: Rng): T {
  const positive = weights.map(w => (w > 0 ? w : 0));
  const total = positive.reduce((sum, w) => sum + w, 0);
  if (total <= 0) {
    return items[Math.floor(rng() * items.length)];
  }
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= positive[i];
    if (roll < 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Restituisce una nuova array permutata casualmente (Fisher-Yates)
 */
export function shuffle<T>(items: T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
