/**
 * Identità persistente del partecipante per stanza: serve a rientrare
 * dopo una disconnessione senza occupare un nuovo slot. In localStorage
 * con chiave per codice stanza; il token è il segreto di rientro.
 */

export interface RoomIdentity {
  participantId: string;
  token: string;
}

const keyFor = (code: string) => `fanta-fc-room-id-${code}`;

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback: abbastanza casuale per una stanza di 8 persone
  return 'id-' + Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')
  ).join('');
}

export function getRoomIdentity(code: string): RoomIdentity {
  try {
    const raw = localStorage.getItem(keyFor(code));
    if (raw) {
      const parsed = JSON.parse(raw) as RoomIdentity;
      if (parsed.participantId && parsed.token) return parsed;
    }
  } catch {
    // localStorage non disponibile o JSON corrotto: rigenera
  }
  const identity: RoomIdentity = { participantId: uuid(), token: uuid() };
  try {
    localStorage.setItem(keyFor(code), JSON.stringify(identity));
  } catch {
    // senza storage l'identità vale per questa sessione
  }
  return identity;
}

export function clearRoomIdentity(code: string): void {
  try {
    localStorage.removeItem(keyFor(code));
  } catch {
    // niente da fare
  }
}
