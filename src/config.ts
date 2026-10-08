/**
 * Configurazione dell'app (valori pubblici, nessun segreto).
 *
 * SITE_URL: indirizzo canonico del sito (canonical, sitemap, condivisione).
 *
 * SUPPORT_URL: pagina di supporto al progetto (Ko-fi, PayPal, ...).
 * Si imposta con la variabile d'ambiente VITE_SUPPORT_URL (es. in
 * `.env.local`); finché è vuota il bottone "Supporta" è visibile ma
 * disattivato.
 *
 * GOATCOUNTER_CODE: codice dell'account GoatCounter (analytics senza
 * cookie), da VITE_GOATCOUNTER_CODE; vuoto = nessuno script.
 */
export const SITE_URL = 'https://www.fantaclash.it';
export const SITE_NAME = 'FantaClash';
export const SUPPORT_URL: string = import.meta.env.VITE_SUPPORT_URL ?? '';
export const GOATCOUNTER_CODE: string = import.meta.env.VITE_GOATCOUNTER_CODE ?? '';

/**
 * MULTIPLAYER_ENABLED: stanze multiplayer su Supabase Realtime.
 * Attiva con VITE_MULTIPLAYER=1; spenta la pagina /multiplayer/ resta
 * raggiungibile ma mostra solo un avviso (noindex).
 */
export const MULTIPLAYER_ENABLED: boolean = import.meta.env.VITE_MULTIPLAYER === '1';
