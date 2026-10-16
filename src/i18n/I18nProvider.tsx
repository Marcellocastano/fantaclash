import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { DEFAULT_LOCALE, LOCALES, Locale, LOCALE_STORAGE_KEY } from './types';
import { translate, TFunction } from './translate';

/**
 * Preferenza lingua come contesto React. Il server e il primo render
 * usano DEFAULT_LOCALE; la preferenza salvata si applica sul client.
 * Con una sola lingua supportata il selettore non si mostra: il provider
 * è già pronto per quando ne arriverà una seconda.
 */

function readStoredLocale(): Locale {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(LOCALE_STORAGE_KEY);
    return (LOCALES as readonly string[]).includes(raw ?? '') ? (raw as Locale) : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
}

const defaultT: TFunction = (key, params, variant) => translate(DEFAULT_LOCALE, key, params, variant);
const I18nContext = createContext<I18nContextValue>({ locale: DEFAULT_LOCALE, setLocale: () => {}, t: defaultT });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // preferenza solo in memoria
    }
    if (typeof document !== 'undefined') document.documentElement.lang = next;
  }, []);

  const t = useMemo<TFunction>(
    () => (key, params, variant) => translate(locale, key, params, variant),
    [locale]
  );
  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Traduttore del componente: ri-renderizza al cambio lingua */
export function useT(): TFunction {
  return useContext(I18nContext).t;
}

/** Lingua corrente e selettore (per il futuro menu lingua) */
export function useLocale(): { locale: Locale; setLocale: (locale: Locale) => void } {
  const { locale, setLocale } = useContext(I18nContext);
  return { locale, setLocale };
}
