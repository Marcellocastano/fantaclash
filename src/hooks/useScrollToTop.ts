import { useEffect, useRef } from 'react';

/**
 * Riporta la pagina in cima quando cambia `key`: le schermate di gioco
 * cambiano senza cambiare indirizzo, quindi il browser non lo fa da solo.
 * Il primo render non scorre (rispetta ancore e ripristino del browser).
 */
export function useScrollToTop(key: unknown): void {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
  }, [key]);
}
