import { createRng, hashSeed, shuffle } from '../../../services/auction/rng';

/**
 * Sequenza del sorteggio a tabellone: pura, niente React.
 * Gli 8 slot del tabellone sono numerati 0-7: slot j = Quarto floor(j/2),
 * lato j % 2 (0 = casa, 1 = trasferta). La squadra dello slot j è sempre
 * order[j], così il tabellone finale coincide con l'ordine deciso.
 * L'ordine di estrazione e i percorsi della roulette sono deterministici:
 * seme = hash FNV-1a di order, PRNG mulberry32. Niente Math.random e
 * niente Rng di gioco: tutti i client di una stanza vedono la stessa
 * sequenza e nessuna casualità di gioco viene consumata.
 */

export interface DrawStep {
  /** Squadra estratta (order[slot]) */
  teamId: string;
  /** Slot di destinazione 0-7 */
  slot: number;
  /** Durata della roulette per questa estrazione (0 = niente roulette) */
  spinMs: number;
  /** Slot accesi in sequenza dalla roulette: solo liberi, mai due uguali
      di fila, ultimo = slot di destinazione */
  path: number[];
  /** Attesa prima dell'accensione di ogni elemento di path (crescente) */
  hopDelays: number[];
}

/** Ritmo a crescendo della roulette per estrazione 1..8 (ms) */
export const SPIN_MS = [1800, 1500, 1300, 1100, 900, 700, 450, 0];
/** Roulette piena quando esce la squadra dell'utente o cade nel suo quarto */
export const USER_SPIN_MS = 1800;
/** Intervalli tra un salto e il successivo (la luce rallenta) */
const MIN_HOP_MS = 70;
const MAX_HOP_MS = 320;
/** Durata media di un salto, per derivare il numero di accensioni */
const HOP_AVG_MS = 200;

export function slotOf(j: number): { quarter: number; side: 'home' | 'away' } {
  return { quarter: Math.floor(j / 2), side: j % 2 === 0 ? 'home' : 'away' };
}

/** Slot occupati dopo le prime `count` estrazioni */
export function occupiedAfter(steps: DrawStep[], count: number): Set<number> {
  return new Set(steps.slice(0, count).map(s => s.slot));
}

export function buildDrawSequence(order: string[], userTeamId: string | null): DrawStep[] {
  const rng = createRng(hashSeed(...order));
  const drawSlots = shuffle(
    Array.from({ length: order.length }, (_, i) => i),
    rng
  );
  const userQuarter = userTeamId ? Math.floor(order.indexOf(userTeamId) / 2) : -1;
  const filled = new Set<number>();

  return drawSlots.map((slot, i) => {
    const teamId = order[slot];
    const free: number[] = [];
    for (let s = 0; s < order.length; s++) if (!filled.has(s)) free.push(s);

    const forUser = teamId === userTeamId || slotOf(slot).quarter === userQuarter;
    const spinMs = free.length <= 1 ? 0 : Math.max(SPIN_MS[i] ?? 0, forUser ? USER_SPIN_MS : 0);

    // Numero di accensioni derivato dalla durata (~200 ms a salto). La
    // destinazione si accende solo alla fine; con 2 slot liberi il percorso
    // più lungo possibile è [altro, destinazione] (nessun candidato oltre).
    const hops =
      free.length === 2
        ? Math.min(spinMs > 0 ? Math.max(2, Math.round(spinMs / HOP_AVG_MS)) : 0, 2)
        : spinMs > 0
          ? Math.max(2, Math.round(spinMs / HOP_AVG_MS))
          : 0;
    const path: number[] = [];
    for (let h = 0; h < hops; h++) {
      const candidates =
        h === hops - 1 ? [slot] : free.filter(s => s !== path[h - 1] && s !== slot);
      path.push(candidates[Math.floor(rng() * candidates.length)]);
    }

    // Intervalli in crescita (70 -> 320 ms), scalati perché sommino a spinMs
    const weights = path.map((_, h) => MIN_HOP_MS + ((MAX_HOP_MS - MIN_HOP_MS) * h) / Math.max(1, hops - 1));
    const sum = weights.reduce((a, b) => a + b, 0);
    const hopDelays = weights.map(w => Math.round((w * spinMs) / sum));

    filled.add(slot);
    return { teamId, slot, spinMs, path, hopDelays };
  });
}
