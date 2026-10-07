import { useCallback, useState } from 'react';

/**
 * Stato React salvato in localStorage: per le preferenze del dispositivo
 * (non fanno parte del GameState). `isValid` scarta valori corrotti.
 */
export function usePersistentState<T>(key: string, initial: T, isValid: (v: unknown) => v is T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      const parsed: unknown = raw === null ? initial : JSON.parse(raw);
      return isValid(parsed) ? parsed : initial;
    } catch {
      return initial;
    }
  });

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // preferenza solo in memoria
      }
    },
    [key]
  );

  return [value, update] as const;
}

export const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
