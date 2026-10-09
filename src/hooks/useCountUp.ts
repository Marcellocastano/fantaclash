import { useEffect, useState } from 'react';

/**
 * Conteggio animato da 0 a `target` in ~`ms` (ease-out). Con movimento
 * ridotto o senza matchMedia (jsdom) restituisce subito il target.
 */
export function useCountUp(target: number, ms = 900): number {
  const reduced =
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [value, setValue] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced || target <= 0) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - (1 - p) ** 3;
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduced]);

  return reduced ? target : value;
}
