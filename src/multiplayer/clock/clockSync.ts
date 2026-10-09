/**
 * Sincronizzazione dell'orologio con l'host.
 * Per ogni PING/PONG: rtt = t1 - t0, offset = hostNow + rtt/2 - t1.
 * Si usa il campione con RTT minimo tra gli ultimi 10 (stima più
 * vicina alla vera andata quando la rete è asimmetrica o congestionata).
 */

const MAX_SAMPLES = 10;

interface Sample {
  rtt: number;
  offset: number;
}

export interface ClockSync {
  /** t0/t1 = invio/ricezione in orologio locale, hostNow = orologio host nel PONG */
  addSample(t0: number, t1: number, hostNow: number): void;
  /** Stima dell'orologio dell'host in ms locali */
  hostNow(localNow?: number): number;
  /** RTT minimo osservato (null prima del primo campione) */
  readonly rtt: number | null;
}

export function createClockSync(now: () => number = Date.now): ClockSync {
  const samples: Sample[] = [];
  return {
    addSample(t0, t1, hostNow) {
      samples.push({ rtt: t1 - t0, offset: hostNow + (t1 - t0) / 2 - t1 });
      if (samples.length > MAX_SAMPLES) samples.shift();
    },
    hostNow(localNow = now()) {
      if (!samples.length) return localNow;
      const best = samples.reduce((a, b) => (b.rtt < a.rtt ? b : a));
      return localNow + best.offset;
    },
    get rtt() {
      if (!samples.length) return null;
      return samples.reduce((a, b) => (b.rtt < a.rtt ? b : a)).rtt;
    },
  };
}
