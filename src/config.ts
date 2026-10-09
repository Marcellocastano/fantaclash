/**
 * Configurazione dell'app (valori pubblici, nessun segreto).
 *
 * SITE_URL: indirizzo canonico del sito (canonical, sitemap, condivisione).
 *
 * SUPPORT_URL: pagina di supporto al progetto (Ko-fi). Predefinita;
 * VITE_SUPPORT_URL, se impostata, prevale.
 *
 * GOATCOUNTER_CODE: codice dell'account GoatCounter (analytics senza
 * cookie), da VITE_GOATCOUNTER_CODE; vuoto = nessuno script.
 */
export const SITE_URL = 'https://www.fantaclash.it';
export const SITE_NAME = 'FantaClash';
export const SUPPORT_URL: string = import.meta.env.VITE_SUPPORT_URL ?? 'https://ko-fi.com/fantaclash';
export const GOATCOUNTER_CODE: string = import.meta.env.VITE_GOATCOUNTER_CODE ?? '';

/**
 * MULTIPLAYER_ENABLED: stanze multiplayer su Supabase Realtime.
 * Attiva con VITE_MULTIPLAYER=1; spenta la pagina /multiplayer/ resta
 * raggiungibile ma mostra solo un avviso (noindex).
 */
export const MULTIPLAYER_ENABLED: boolean = import.meta.env.VITE_MULTIPLAYER === '1';
