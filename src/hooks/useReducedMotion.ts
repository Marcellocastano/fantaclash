import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function prefersReduced(): boolean {
  return (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function' ||
    window.matchMedia(QUERY).matches
  );
}

/**
 * Preferenza "riduci movimento" del sistema: vera di default dove
 * matchMedia non esiste (jsdom, SSR). Reagisce ai cambi dal vivo.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReduced);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(QUERY);
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return reduced;
}
