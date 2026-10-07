/**
 * Configurazione dell'app (valori pubblici, nessun segreto).
 *
 * SUPPORT_URL: pagina di supporto al progetto (Ko-fi, PayPal, ...).
 * Si imposta con la variabile d'ambiente VITE_SUPPORT_URL (es. in
 * `.env.local`); finché è vuota il bottone "Supporta" è visibile ma
 * disattivato.
 */
export const SUPPORT_URL: string = import.meta.env.VITE_SUPPORT_URL ?? '';
