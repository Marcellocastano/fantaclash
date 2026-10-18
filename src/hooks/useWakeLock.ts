import { useEffect, useRef } from 'react';

/**
 * Mantiene lo schermo acceso (Screen Wake Lock API) finché `active` è vero.
 * No-op dove non supportato; gli errori di request/release si ignorano
 * (pagina nascosta o batteria scarica). Il browser rilascia il lock quando
 * la pagina va in background: lo riprendiamo al ritorno in primo piano.
 */
export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const requestingRef = useRef(false);

  useEffect(() => {
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLock }).wakeLock;
    if (!active || !wakeLock) return;
    let stopped = false;

    const acquire = () => {
      if (stopped || requestingRef.current || sentinelRef.current) return;
      requestingRef.current = true;
      wakeLock
        .request('screen')
        .then(s => {
          if (stopped) {
            void Promise.resolve(s.release()).catch(() => {});
            return;
          }
          sentinelRef.current = s;
          s.addEventListener('release', () => {
            if (sentinelRef.current === s) sentinelRef.current = null;
          });
        })
        .catch(() => {})
        .finally(() => {
          requestingRef.current = false;
        });
    };

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      // Il browser rilascia il lock quando la pagina esce dallo schermo:
      // tornati in primo piano va richiesto di nuovo
      sentinelRef.current = null;
      acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisibility);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel) void Promise.resolve(sentinel.release()).catch(() => {});
    };
  }, [active]);
}
