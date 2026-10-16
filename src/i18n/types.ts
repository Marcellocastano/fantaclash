/**
 * Lingue supportate e preferenza dell'utente. Oggi esiste solo l'italiano:
 * la preferenza è già persistita così l'aggiunta di una lingua richiede
 * solo il catalogo e il selettore, non un cambio di architettura.
 */
export type Locale = 'it';
export const LOCALES: readonly Locale[] = ['it'];
export const DEFAULT_LOCALE: Locale = 'it';

/** Chiave localStorage della preferenza (separata dal salvataggio partita) */
export const LOCALE_STORAGE_KEY = 'fanta-fc-locale';
