import { useEffect, useState } from 'react';

const KEY = 'fanta-fc-streamer-mode';
const EVENT = 'fanta-fc-streamer-changed';

const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true';
  } catch {
    return false;
  }
}

function write(on: boolean) {
  try {
    localStorage.setItem(KEY, String(on));
  } catch {
    // preferenza solo in memoria
  }
  window.dispatchEvent(new CustomEvent(EVENT));
  listeners.forEach(l => l());
}

/**
 * Modalità streamer: libera l'angolo in alto a destra per la webcam.
 * Preferenza del dispositivo (localStorage), condivisa tra componenti e
 * schede. Letta dopo il montaggio per non rompere il prerender.
 */
export function useStreamerMode(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(read());
    const sync = () => setOn(read());
    listeners.add(sync);
    window.addEventListener('storage', sync);
    window.addEventListener(EVENT, sync);
    return () => {
      listeners.delete(sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);
  return [on, write];
}
