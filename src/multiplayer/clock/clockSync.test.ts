import { describe, it, expect } from 'vitest';
import { createClockSync } from './clockSync';

describe('clockSync', () => {
  it('stima hostNow con clock locale sfasato di +5000 ms e rtt variabili', () => {
    const SKEW = 5000;
    // orologio locale sfasato: quando il server vale S, il client legge S+SKEW
    const sync = createClockSync();
    let S = 1_000_000;
    const rtts = [40, 120, 60, 200, 90, 45, 150, 80, 70, 55];
    for (const rtt of rtts) {
      const t0 = S + SKEW;            // invio in orologio locale
      const hostNow = S + rtt / 2;    // PONG spedito a metà viaggio (simmetrico)
      const t1 = t0 + rtt;            // ritorno in orologio locale
      sync.addSample(t0, t1, hostNow);
      S += 1000;
    }
    const minRtt = Math.min(...rtts);
    // hostNow() usa Date.now reale: simulo leggendo "l'orologio locale sfasato"
    const localNow = S + SKEW;
    const estimate = sync.hostNow(localNow);
    expect(Math.abs(estimate - S)).toBeLessThanOrEqual(minRtt / 2);
    expect(sync.rtt).toBe(minRtt);
  });

  it('senza campioni restituisce l’orologio locale', () => {
    const sync = createClockSync(() => 12345);
    expect(sync.hostNow()).toBe(12345);
    expect(sync.rtt).toBeNull();
  });
});
