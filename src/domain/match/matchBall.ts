import { createRng, hashSeed } from '../../services/auction/rng';
import { MatchEvent, MatchTick } from './matchTypes';

/**
 * Traiettoria del pallone per l'indicatore d'attacco.
 *
 * È solo presentazione: si calcola DOPO la simulazione, a partire dagli
 * eventi reali, e usa un Rng separato (hashSeed(seed, 'ball')), quindi non
 * altera l'esito. Conoscendo in anticipo l'intera partita si possono
 * costruire azioni credibili:
 * - ogni occasione è un punto fisso in area (±0.72..0.90), ogni gol è a
 *   fondo campo (±1); dopo un gol o l'intervallo si riparte da 0;
 * - nei minuti senza eventi il pallone segue il territorio (inerzia del
 *   tick) con un rumore lento, mai fermo nello stesso punto;
 * - il pallone non può spostarsi più di BALL_MAX_STEP per minuto: le
 *   azioni si costruiscono nei minuti precedenti l'occasione (il
 *   contropiede parte dalla propria metà campo) e la palla torna indietro
 *   gradualmente dopo un tiro.
 */

/** Spostamento massimo del pallone in un minuto (frazione di metà campo) */
export const BALL_MAX_STEP = 0.3;
/** Fascia dell'area di rigore */
export const BALL_BOX_MIN = 0.72;
export const BALL_BOX_MAX = 0.9;

const SHOT_TYPES = new Set<MatchEvent['type']>([
  'chance',
  'save',
  'miss',
  'woodwork',
  'penalty',
  'penalty_missed',
]);

export interface BallPathInput {
  seed: number;
  ticks: MatchTick[];
  events: MatchEvent[];
  halfTimeTick: number;
  fullTimeTick: number;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export function computeBallPath({ seed, ticks, events, halfTimeTick, fullTimeTick }: BallPathInput): number[] {
  const rng = createRng(hashSeed(seed, 'ball'));
  const n = ticks.length;
  const pos = new Array<number>(n).fill(0);
  const pinned = new Array<boolean>(n).fill(false);
  /** Il tick riparte da una rimessa al centro: nessun vincolo col precedente */
  const restart = new Array<boolean>(n).fill(false);
  const sgn = (e: MatchEvent) => (e.side === 'home' ? 1 : -1);

  // Territorio: inerzia del tick + rumore lento (media mobile)
  let drift = 0;
  for (let t = 0; t < n; t++) {
    drift = 0.75 * drift + 0.25 * (rng() * 2 - 1);
    // Saturazione morbida: niente valori "a fine corsa" ripetuti
    pos[t] = 0.7 * Math.tanh(1.2 * (0.55 * ticks[t].pressure + 0.45 * drift));
  }

  const pin = (t: number, value: number, isRestart = false) => {
    if (t < 0 || t >= n) return;
    pos[t] = value;
    pinned[t] = true;
    if (isRestart) restart[t] = true;
  };
  const soft = (t: number, value: number) => {
    if (t > 0 && t < n && !pinned[t]) pos[t] = value;
  };

  pin(0, 0, true);
  if (halfTimeTick + 1 < n) pin(halfTimeTick + 1, (rng() - 0.5) * 0.1, true);

  const byTick = new Map<number, MatchEvent[]>();
  for (const e of events) byTick.set(e.tick, [...(byTick.get(e.tick) ?? []), e]);

  for (let t = 1; t < n; t++) {
    const evs = byTick.get(t) ?? [];
    if (t > fullTimeTick) {
      // Lotteria dei rigori: ogni rigore riparte dal dischetto
      const kick = evs.find(e => e.type === 'shootout_kick');
      if (kick) pin(t, sgn(kick) * (kick.scored ? 1 : 0.82 + 0.04 * rng()), true);
      continue;
    }
    const goal = evs.find(e => e.type === 'goal' || e.type === 'own_goal');
    if (goal) {
      pin(t, sgn(goal));
      // Ripresa da centrocampo dopo il gol (salvo che sia l'ultimo minuto)
      if (t + 1 <= fullTimeTick && t + 1 !== halfTimeTick + 1) pin(t + 1, (rng() - 0.5) * 0.1, true);
      continue;
    }
    const shot = evs.find(e => SHOT_TYPES.has(e.type));
    if (shot) {
      const s = sgn(shot);
      const isPenalty = shot.type === 'penalty' || shot.type === 'penalty_missed';
      pin(t, s * (isPenalty ? 0.84 + 0.02 * rng() : BALL_BOX_MIN + (BALL_BOX_MAX - BALL_BOX_MIN) * rng()));
      // Contropiede: palla recuperata nella propria metà due minuti prima
      if (shot.chanceKind === 'contropiede') soft(t - 2, -s * (0.15 + 0.25 * rng()));
      // Dopo il tiro: rinvio o respinta, il pallone resta in quella metà
      soft(t + 1, s * (0.35 + 0.2 * rng()));
    }
  }

  // Velocità massima: passate avanti e indietro, i punti fissi non si muovono
  for (let iter = 0; iter < 4; iter++) {
    for (let t = 1; t < n; t++) {
      if (pinned[t] || restart[t]) continue;
      pos[t] = clamp(pos[t], pos[t - 1] - BALL_MAX_STEP, pos[t - 1] + BALL_MAX_STEP);
    }
    for (let t = n - 2; t >= 1; t--) {
      if (pinned[t] || restart[t + 1]) continue;
      pos[t] = clamp(pos[t], pos[t + 1] - BALL_MAX_STEP, pos[t + 1] + BALL_MAX_STEP);
    }
  }

  // Punti fissi troppo vicini per la velocità massima (es. occasione subito
  // dopo una ripresa): il tratto tra i due si distribuisce in modo uniforme
  // invece di concentrare il salto in un solo minuto
  let prevPin = 0;
  for (let t = 1; t < n; t++) {
    if (!pinned[t]) continue;
    const gap = t - prevPin;
    if (!restart[t] && gap > 1 && Math.abs(pos[t] - pos[prevPin]) > BALL_MAX_STEP * gap) {
      for (let k = prevPin + 1; k < t; k++) pos[k] = pos[prevPin] + ((pos[t] - pos[prevPin]) * (k - prevPin)) / gap;
    }
    prevPin = t;
  }

  return pos.map(x => Math.round(clamp(x, -1, 1) * 1000) / 1000);
}
