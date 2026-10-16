import { useCallback, useEffect, useRef, useState } from 'react';
import { playSound } from '../../../services/sound';
import { DrawStep } from './drawSequence';

/**
 * Macchina a stati del sorteggio a tabellone:
 *   reveal (figurina sulla coppa) -> spin (roulette sugli slot liberi)
 *   -> fly (volo FLIP nello slot) -> land (timbro) -> step successivo -> done.
 * Un solo timer per volta guidato dallo stato corrente; skip() porta
 * istantaneamente allo stato finale. onDrawn(order) è chiamato una sola
 * volta all'ingresso in done (animazione completa o skip che siano).
 * Con prefers-reduced-motion: niente roulette né volo, reveal -> slot pieno.
 */

export type DrawPhase = 'reveal' | 'spin' | 'fly' | 'land' | 'done';

export const REVEAL_MS = 600;
/** Pausa sulla destinazione (doppio lampeggio) prima del volo */
export const LOCK_MS = 250;
export const FLY_MS = 550;
export const LAND_MS = 350;
/** Movimento ridotto: reveal -> land, ~900 ms a estrazione */
export const REDUCED_REVEAL_MS = 500;
export const REDUCED_LAND_MS = 400;
/** Tick della roulette: massimo uno ogni 90 ms per non saturare l'audio */
const TICK_MIN_MS = 90;

interface UseDrawPlaybackArgs {
  steps: DrawStep[];
  order: string[];
  reduced: boolean;
  onDrawn?: (order: string[]) => void;
}

export interface DrawPlayback {
  phase: DrawPhase;
  stepIndex: number;
  step: DrawStep | null;
  /** Slot già riempiti */
  placed: ReadonlySet<number>;
  /** Slot acceso dalla roulette (o destinazione durante il volo) */
  litSlot: number | null;
  /** Destinazione raggiunta: doppio lampeggio prima del volo */
  lockedSlot: number | null;
  /** Slot in fase di timbro */
  landingSlot: number | null;
  skip: () => void;
}

export function useDrawPlayback({ steps, order, reduced, onDrawn }: UseDrawPlaybackArgs): DrawPlayback {
  const [phase, setPhase] = useState<DrawPhase>('reveal');
  const [stepIndex, setStepIndex] = useState(0);
  /** Accensioni completate nella roulette dello step corrente */
  const [hop, setHop] = useState(0);
  const [placed, setPlaced] = useState<Set<number>>(() => new Set());
  const committed = useRef(false);
  // Callback sempre aggiornati senza riavviare i timer quando il genitore si ridisegna
  const callbacks = useRef({ onDrawn });
  callbacks.current = { onDrawn };
  const lastTick = useRef(0);

  const step = steps[stepIndex] ?? null;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const s = steps[stepIndex] ?? null;
    switch (phase) {
      case 'reveal': {
        playSound('draw-ball');
        timer = setTimeout(() => {
          if (!s) {
            setPhase('done');
            return;
          }
          if (reduced || s.path.length === 0) {
            setPlaced(prev => new Set(prev).add(s.slot));
            setPhase('land');
          } else {
            setHop(0);
            setPhase('spin');
          }
        }, reduced ? REDUCED_REVEAL_MS : REVEAL_MS);
        break;
      }
      case 'spin': {
        if (!s) {
          setPhase('done');
          break;
        }
        if (hop < s.path.length) {
          timer = setTimeout(() => {
            const now = performance.now();
            if (now - lastTick.current >= TICK_MIN_MS) {
              playSound('tick');
              lastTick.current = now;
            }
            setHop(hop + 1);
          }, s.hopDelays[hop]);
        } else {
          timer = setTimeout(() => setPhase('fly'), LOCK_MS);
        }
        break;
      }
      case 'fly': {
        timer = setTimeout(() => {
          if (s) setPlaced(prev => new Set(prev).add(s.slot));
          setPhase('land');
        }, FLY_MS);
        break;
      }
      case 'land': {
        playSound('sold');
        timer = setTimeout(() => {
          if (stepIndex + 1 >= steps.length) {
            setPhase('done');
          } else {
            setStepIndex(stepIndex + 1);
            setHop(0);
            setPhase('reveal');
          }
        }, reduced ? REDUCED_LAND_MS : LAND_MS);
        break;
      }
      case 'done': {
        playSound('won');
        if (!committed.current) {
          committed.current = true;
          callbacks.current.onDrawn?.(order);
        }
        break;
      }
    }
    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [phase, stepIndex, hop, steps, order, reduced]);

  const skip = useCallback(() => {
    setPlaced(new Set(steps.map(s => s.slot)));
    setStepIndex(steps.length);
    setPhase('done');
  }, [steps]);

  const litSlot =
    phase === 'spin' && step
      ? hop > 0
        ? step.path[hop - 1]
        : null
      : phase === 'fly' && step
        ? step.slot
        : null;
  const lockedSlot = phase === 'spin' && step && step.path.length > 0 && hop >= step.path.length ? step.slot : null;
  const landingSlot = phase === 'land' && step ? step.slot : null;

  return { phase, stepIndex, step, placed, litSlot, lockedSlot, landingSlot, skip };
}
