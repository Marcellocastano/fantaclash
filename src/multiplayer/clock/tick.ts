/**
 * Sorgente di tick periodico: cb ogni `ms`, la funzione restituita
 * disiscrive. Iniettabile nel driver d'asta e nelle sessioni di rete
 * per poter sostituire il timer (es. Web Worker, fake timers nei test).
 */
export type TickFn = (cb: () => void, ms: number) => () => void;

export const intervalTick: TickFn = (cb, ms) => {
  const id = setInterval(cb, ms);
  return () => clearInterval(id);
};
