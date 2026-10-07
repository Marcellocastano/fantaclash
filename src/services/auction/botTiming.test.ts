import { describe, it, expect } from 'vitest';
import {
  planBotBidDelay,
  planBotCallDelay,
  lotClockStep,
  SNIPE_SAFETY_MS,
  FAST_MAX_MS,
} from './botTiming';
import { ARCHETYPE_PROFILES } from './personalities';
import { createRng } from './rng';
import { BotArchetype } from '../../types';

const ALL: BotArchetype[] = [
  'aggressivo',
  'parsimonioso',
  'stratega',
  'cacciatore',
  'equilibrato',
];

describe('botTiming', () => {
  it('delay sempre in [0, max(0, timeLeft-120)] su 10k campioni', () => {
    const rng = createRng(1234);
    const timeLefts = [-50, 0, 50, 200, 1000, 5000];
    for (let i = 0; i < 10000; i++) {
      const timeLeft = timeLefts[i % timeLefts.length];
      const pressure = rng();
      const archetype = ALL[i % ALL.length];
      const { delay } = planBotBidDelay({ pressure, archetype, timeLeft, rng });
      const upper = Math.max(0, timeLeft - SNIPE_SAFETY_MS);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(upper);
    }
  });

  it('pressure 0.9, timeLeft 5000: ogni archetipo snipa (delay >= 4000) almeno nel 35% dei casi', () => {
    for (const archetype of ALL) {
      const rng = createRng(99);
      let snipes = 0;
      const n = 2000;
      for (let i = 0; i < n; i++) {
        const { delay } = planBotBidDelay({ pressure: 0.9, archetype, timeLeft: 5000, rng });
        if (delay >= 4000) snipes++;
      }
      expect(snipes / n).toBeGreaterThanOrEqual(0.35);
    }
  });

  it('pressure 0.1: equilibrato risponde in fretta (delay < 1200) almeno nel 45% dei casi', () => {
    const rng = createRng(12);
    let fast = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) {
      const { delay } = planBotBidDelay({
        pressure: 0.1,
        archetype: 'equilibrato',
        timeLeft: 5000,
        rng,
      });
      if (delay < FAST_MAX_MS) fast++;
    }
    expect(fast / n).toBeGreaterThanOrEqual(0.45);
  });

  it('a pari pressure lo stratega usa "ultimo" più dell\'aggressivo', () => {
    const share = (archetype: BotArchetype) => {
      const rng = createRng(55);
      let ultimo = 0;
      const n = 2000;
      for (let i = 0; i < n; i++) {
        const { mode } = planBotBidDelay({ pressure: 0.5, archetype, timeLeft: 5000, rng });
        if (mode === 'ultimo') ultimo++;
      }
      return ultimo / n;
    };
    expect(share('stratega')).toBeGreaterThan(share('aggressivo'));
  });

  it('deterministico a parità di seme', () => {
    const draw = (seed: number) =>
      Array.from({ length: 20 }, (_, i) =>
        planBotBidDelay({
          pressure: i / 20,
          archetype: 'equilibrato',
          timeLeft: 4000,
          rng: createRng(seed + i),
        })
      );
    expect(draw(1)).toEqual(draw(1));
  });

  it('planBotCallDelay è nel range dell\'archetipo', () => {
    const rng = createRng(9);
    for (const archetype of ALL) {
      const [min, max] = ARCHETYPE_PROFILES[archetype].timing.callDelayMs;
      for (let i = 0; i < 100; i++) {
        const d = planBotCallDelay(archetype, rng);
        expect(d).toBeGreaterThanOrEqual(min);
        expect(d).toBeLessThanOrEqual(max);
      }
    }
  });

  it('lotClockStep: bid se il rilancio pendente è dovuto', () => {
    expect(lotClockStep({ now: 1000, deadline: 5000, pendingAt: 1000 })).toBe('bid');
    expect(lotClockStep({ now: 1500, deadline: 5000, pendingAt: 1000 })).toBe('bid');
  });

  it('lotClockStep: il rilancio dovuto vince sulla scadenza nello stesso tick', () => {
    expect(lotClockStep({ now: 5000, deadline: 5000, pendingAt: 5000 })).toBe('bid');
  });

  it('lotClockStep: close alla deadline senza rilancio pendente', () => {
    expect(lotClockStep({ now: 5000, deadline: 5000, pendingAt: null })).toBe('close');
    expect(lotClockStep({ now: 6000, deadline: 5000, pendingAt: null })).toBe('close');
    // Rilancio pianificato oltre la deadline non blocca la chiusura
    expect(lotClockStep({ now: 6000, deadline: 5000, pendingAt: 7000 })).toBe('close');
  });

  it('lotClockStep: wait prima della deadline', () => {
    expect(lotClockStep({ now: 1000, deadline: 5000, pendingAt: null })).toBe('wait');
    expect(lotClockStep({ now: 1000, deadline: 5000, pendingAt: 3000 })).toBe('wait');
  });
});
