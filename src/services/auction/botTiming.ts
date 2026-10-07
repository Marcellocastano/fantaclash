import { BotArchetype } from '../../types';
import { Rng } from './rng';
import { ARCHETYPE_PROFILES } from './personalities';

/**
 * Tempi di reazione dei bot: quanto aspettano prima di rilanciare o
 * chiamare. Tutto deterministico dato un rng seedato: il gioco reale
 * passa Math.random, i test un rng mulberry32.
 */

/** Reazione minima di un bot (ms) */
export const MIN_REACTION_MS = 250;
/** Limite superiore della fascia "reattiva" (ms) */
export const FAST_MAX_MS = 1200;
/** Ampiezza della finestra di snipe prima della scadenza (ms) */
export const SNIPE_WINDOW_MS = 900;
/** Margine di sicurezza: nessun rilancio più tardi di deadline − questo (ms) */
export const SNIPE_SAFETY_MS = 120;

/**
 * Modalità temporale di un rilancio: subito, a metà, o all'ultimo istante
 */
export type BidTimingMode = 'reattivo' | 'riflessivo' | 'ultimo';

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * Pianifica il ritardo del rilancio di un bot sul lotto corrente.
 *
 * La pressione (offerta attuale / limite del bot) sposta i pesi: più si
 * è vicini al limite più tende lo snipe, più si è lontani più tende la
 * reazione rapida. Il ritardo è sempre compreso in [0, upper] con
 * upper = max(0, timeLeft − SNIPE_SAFETY_MS).
 */
export function planBotBidDelay(p: {
  /** clamp01(currentBid / limite del bot) */
  pressure: number;
  archetype: BotArchetype;
  /** ms rimanenti alla scadenza del lotto (può essere <= 0) */
  timeLeft: number;
  rng: Rng;
}): { delay: number; mode: BidTimingMode } {
  const { archetype, timeLeft, rng } = p;
  const pressure = clamp01(p.pressure);
  const timing = ARCHETYPE_PROFILES[archetype].timing;

  const wUlt = timing.snipeBase + 0.6 * pressure * pressure;
  const wFast = (1 - pressure) * (1 - pressure) * timing.fastness;
  const wMid = Math.max(0.05, 1 - wUlt - wFast);
  const total = wUlt + wFast + wMid;

  const roll = rng() * total;
  const mode: BidTimingMode =
    roll < wFast ? 'reattivo' : roll < wFast + wMid ? 'riflessivo' : 'ultimo';

  const upper = Math.max(0, timeLeft - SNIPE_SAFETY_MS);

  const intervals: Record<BidTimingMode, [number, number]> = {
    reattivo: [MIN_REACTION_MS, FAST_MAX_MS],
    riflessivo: [FAST_MAX_MS, timeLeft - FAST_MAX_MS],
    ultimo: [timeLeft - SNIPE_WINDOW_MS, upper],
  };
  const modes: BidTimingMode[] = ['reattivo', 'riflessivo', 'ultimo'];

  const clampInterval = (iv: [number, number]): [number, number] => [
    Math.min(upper, Math.max(0, iv[0])),
    Math.min(upper, Math.max(0, iv[1])),
  ];

  // Intervallo della modalità scelta; se vuoto dopo il clamp si usa
  // l'intervallo valido più vicino
  let chosen = clampInterval(intervals[mode]);
  if (!(chosen[0] < chosen[1])) {
    const idx = modes.indexOf(mode);
    for (let d = 1; d < modes.length; d++) {
      const before = idx - d;
      const after = idx + d;
      if (before >= 0) {
        const iv = clampInterval(intervals[modes[before]]);
        if (iv[0] < iv[1]) { chosen = iv; break; }
      }
      if (after < modes.length) {
        const iv = clampInterval(intervals[modes[after]]);
        if (iv[0] < iv[1]) { chosen = iv; break; }
      }
    }
  }

  const delay =
    chosen[0] < chosen[1] ? chosen[0] + rng() * (chosen[1] - chosen[0]) : chosen[0];

  return { delay: Math.min(upper, Math.max(0, delay)), mode };
}

/**
 * Ritardo uniforme della chiamata di un bot, nel range dell'archetipo.
 */
export function planBotCallDelay(archetype: BotArchetype, rng: Rng): number {
  const [min, max] = ARCHETYPE_PROFILES[archetype].timing.callDelayMs;
  return min + rng() * (max - min);
}

/**
 * Passo del clock del lotto: decide cosa deve accadere a questo tick.
 * Un rilancio pendente scaduto ha la precedenza sulla chiusura a parità
 * di istante (l'offerta è stata pianificata entro la deadline).
 */
export function lotClockStep(p: {
  now: number;
  deadline: number;
  /** Istante pianificato del rilancio pendente, null se assente */
  pendingAt: number | null;
}): 'bid' | 'close' | 'wait' {
  if (p.pendingAt !== null && p.pendingAt <= p.now) return 'bid';
  if (p.now >= p.deadline) return 'close';
  return 'wait';
}
