import { RoomKeyPair } from './crypto';
import { HostBook } from './host';
import { HostSession } from './hostSession';
import { RoomState } from './protocol';

/**
 * Salvataggio della stanza dell'host: se ricarica la pagina la stanza
 * non muore — stato, libro dei segreti e chiave ECDSA restano nel
 * localStorage del suo browser e la ripresa riprende da lì.
 * Chiave `fanta-fc-room-host-<code>`, valida 2 ore.
 */

export interface HostSave {
  state: RoomState;
  book: {
    tokens: Record<string, string>;
    kicked: string[];
    publicKeys: Record<string, JsonWebKey>;
  };
  hostKey: RoomKeyPair;
  savedAt: number;
}

export const HOST_SAVE_TTL_MS = 2 * 60 * 60 * 1000;
export const HOST_SAVE_MIN_INTERVAL_MS = 1000;

const keyFor = (code: string) => `fanta-fc-room-host-${code}`;

export function saveHostState(save: HostSave): void {
  try {
    localStorage.setItem(keyFor(save.state.code), JSON.stringify(save));
  } catch {
    // storage pieno o assente: la ripresa non sarà possibile
  }
}

/** Carica il salvataggio se esiste, è fresco e appartiene a questo host */
export function loadHostSave(code: string, hostId: string): HostSave | null {
  try {
    const raw = localStorage.getItem(keyFor(code));
    if (!raw) return null;
    const save = JSON.parse(raw) as HostSave;
    if (save.state?.hostId !== hostId || save.state?.code !== code) return null;
    if (Date.now() - save.savedAt > HOST_SAVE_TTL_MS) return null;
    if (!save.hostKey?.privateJwk || !save.book) return null;
    return save;
  } catch {
    return null;
  }
}

export function clearHostSave(code: string): void {
  try {
    localStorage.removeItem(keyFor(code));
  } catch {
    // niente da fare
  }
}

export function serializeBook(book: HostBook): HostSave['book'] {
  return {
    tokens: book.tokens,
    kicked: [...book.kicked],
    publicKeys: book.publicKeys,
  };
}

export function deserializeBook(saved: HostSave['book']): HostBook {
  return {
    tokens: saved.tokens ?? {},
    kicked: new Set(saved.kicked ?? []),
    publicKeys: saved.publicKeys ?? {},
    matchChoices: {},
  };
}

/**
 * Tiene il salvataggio aggiornato: al massimo una scrittura al secondo
 * dopo ogni cambio di stato, più una scrittura su pagehide.
 * Restituisce la funzione di distacco.
 */
export function attachHostSaver(session: HostSession, hostKey: RoomKeyPair): () => void {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const write = () => {
    last = Date.now();
    saveHostState({
      state: session.getState(),
      book: serializeBook(session.getBook()),
      hostKey,
      savedAt: last,
    });
  };

  const unsub = session.subscribe(() => {
    const wait = HOST_SAVE_MIN_INTERVAL_MS - (Date.now() - last);
    if (wait <= 0) write();
    else if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        write();
      }, wait);
    }
  });

  const onHide = () => write();
  window.addEventListener('pagehide', onHide);
  window.addEventListener('beforeunload', onHide);

  return () => {
    unsub();
    if (timer) clearTimeout(timer);
    window.removeEventListener('pagehide', onHide);
    window.removeEventListener('beforeunload', onHide);
  };
}
