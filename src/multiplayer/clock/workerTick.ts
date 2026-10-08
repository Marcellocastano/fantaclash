import { intervalTick, TickFn } from './tick';

/**
 * Tick da Web Worker: i timer del worker NON subiscono il throttling
 * aggressivo delle schede in background (almeno nel primo minuto),
 * quindi il driver dell'asta continua a battere quando la pagina è
 * nascosta. Worker creato da Blob inline: nessun file extra nel bundle.
 * Fallback a setInterval dove Worker/createObjectURL non esistono.
 */

const WORKER_SRC = `
  let id = null;
  onmessage = (e) => {
    if (id) clearInterval(id);
    id = setInterval(() => postMessage(0), e.data.ms);
  };
`;

interface SharedWorker {
  worker: Worker;
  url: string;
  listeners: Set<() => void>;
}

const shared = new Map<number, SharedWorker>();

function acquire(ms: number): SharedWorker | null {
  const existing = shared.get(ms);
  if (existing) return existing;
  try {
    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
    const worker = new Worker(url);
    const entry: SharedWorker = { worker, url, listeners: new Set() };
    worker.onmessage = () => entry.listeners.forEach(cb => cb());
    worker.postMessage({ ms });
    shared.set(ms, entry);
    return entry;
  } catch {
    return null;
  }
}

export function createWorkerTick(): TickFn {
  if (typeof Worker === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
    return intervalTick;
  }
  return (cb, ms) => {
    const entry = acquire(ms);
    if (!entry) return intervalTick(cb, ms);
    entry.listeners.add(cb);
    return () => {
      entry.listeners.delete(cb);
      if (entry.listeners.size === 0) {
        entry.worker.terminate();
        URL.revokeObjectURL(entry.url);
        shared.delete(ms);
      }
    };
  };
}
