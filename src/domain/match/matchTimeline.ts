import { MatchEvent, MatchResult } from './matchTypes';
import { lastTick } from './matchPlayback';

/**
 * Ritmo di riproduzione della partita, condiviso tra gioco singolo e
 * stanza multiplayer. Il motore produce l'intero MatchResult: chi guarda
 * deve solo decidere QUANDO mostrare il tick successivo. In stanza ogni
 * client ricalcola il tick da una timeline deterministica ancorata
 * all'orologio dell'host, quindi queste costanti devono coincidere.
 */

/** Durata base di un minuto a velocità 1x (ms) */
export const TICK_MS = 520;

/** Rigori: suspense della rincorsa e tempo per leggere l'esito (ms a 1x) */
export const KICK_SUSPENSE_MS = 1500;
export const KICK_RESULT_MS = 1300;
/** Suspense extra per il rigore che decide la serie */
export const DECISIVE_EXTRA_MS = 1000;

/** Pausa extra dopo un evento importante, per leggere l'animazione (ms a 1x) */
export const HOLD_MS: Partial<Record<MatchEvent['type'], number>> = {
  goal: 1800,
  own_goal: 1800,
  red_card: 1600,
  penalty: 1100,
  penalty_missed: 1100,
  chance: 700,
  save: 800,
  woodwork: 800,
  yellow_card: 600,
  half_time: 1200,
  shootout_start: 1400,
  shootout_kick: KICK_SUSPENSE_MS + KICK_RESULT_MS,
};

/**
 * Il ritardo per passare da `tick` a `tick + 1`: la durata base più il
 * tempo di lettura dell'evento più lungo del tick, divisi per la velocità.
 */
export function tickDurationMs(result: MatchResult, tick: number, speed: number): number {
  const hold = Math.max(0, ...result.events.filter(e => e.tick === tick).map(e => HOLD_MS[e.type] ?? 0));
  return (TICK_MS + hold) / speed;
}

export interface TimelineInput {
  result: MatchResult;
  /** Tick a cui si è ancorata la riproduzione */
  anchorTick: number;
  /** Istante (orologio host) in cui si è arrivati ad anchorTick */
  anchorAt: number;
  /** Adesso (orologio host) */
  now: number;
  speed: number;
  /** Tick oltre il quale non avanzare (prossimo arresto) */
  stopTick: number;
}

export interface Timeline {
  tick: number;
  /**
   * Istante deterministico (orologio host) in cui si raggiunge `stopTick`,
   * null se non ci si è ancora arrivati.
   */
  reachedStopAt: number | null;
}

/**
 * Posizione corrente sulla timeline: da `anchorTick` all'istante
 * `anchorAt` si sommano le durate dei tick fino a `now`, senza superare
 * `stopTick`. Deterministica: tutti i client vedono lo stesso tick.
 */
export function computeTimeline({ result, anchorTick, anchorAt, now, speed, stopTick }: TimelineInput): Timeline {
  let t = anchorTick;
  let at = anchorAt;
  while (t < stopTick) {
    const next = at + tickDurationMs(result, t, speed);
    if (next > now) break;
    at = next;
    t++;
  }
  return { tick: t, reachedStopAt: t >= stopTick ? at : null };
}

/**
 * Prossimo tick di arresto >= anchorTick: il tick PRIMA di ogni punto di
 * decisione non ancora risolto; poi l'inizio dei rigori (ordine da
 * scegliere) se serve un lato umano; infine il fischio finale.
 * Senza lati umani le partite non vanno live, ma per robustezza vale
 * l'ultimo tick.
 */
export function nextStop(
  result: MatchResult,
  anchorTick: number,
  resolvedStops: number[],
  hasHuman: boolean
): number {
  const end = lastTick(result);
  if (!hasHuman) return end;
  for (const d of result.decisionTicks) {
    const stop = d - 1;
    if (stop >= anchorTick && !resolvedStops.includes(stop)) return stop;
  }
  if (result.shootout) {
    const stop = result.fullTimeTick;
    if (stop >= anchorTick && !resolvedStops.includes(stop)) return stop;
  }
  return end;
}
