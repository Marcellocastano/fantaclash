import { generateRoomKeyPair, RoomKeyPair } from './crypto';

/**
 * Identità persistente del partecipante per stanza: serve a rientrare
 * dopo una disconnessione senza occupare un nuovo slot. In localStorage
 * con chiave per codice stanza; il token e la chiave privata ECDSA sono
 * i segreti di rientro. Nickname e nome squadra permettono il rientro
 * con un click.
 */

export interface RoomIdentity {
  participantId: string;
  token: string;
  keyPair?: RoomKeyPair;
  nickname?: string;
  teamName?: string;
}

const keyFor = (code: string) => `fanta-fc-room-id-${code}`;

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback: abbastanza casuale per una stanza di 8 persone
  return 'id-' + Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')
  ).join('');
}

function read(code: string): RoomIdentity | null {
  try {
    const raw = localStorage.getItem(keyFor(code));
    if (raw) {
      const parsed = JSON.parse(raw) as RoomIdentity;
      if (parsed.participantId && parsed.token) return parsed;
    }
  } catch {
    // localStorage non disponibile o JSON corrotto: rigenera
  }
  return null;
}

function write(code: string, identity: RoomIdentity): void {
  try {
    localStorage.setItem(keyFor(code), JSON.stringify(identity));
  } catch {
    // senza storage l'identità vale per questa sessione
  }
}

/** Identità sincrona (com'è oggi): senza chiave se non già salvata */
export function getRoomIdentity(code: string): RoomIdentity {
  const existing = read(code);
  if (existing) return existing;
  const identity: RoomIdentity = { participantId: uuid(), token: uuid() };
  write(code, identity);
  return identity;
}

/**
 * Identità completa con coppia ECDSA: genera la chiave al primo uso e
 * la conserva. Aggiorna anche nickname/teamName per il rientro.
 */
export async function ensureRoomIdentity(
  code: string,
  names?: { nickname?: string; teamName?: string }
): Promise<RoomIdentity> {
  const identity = getRoomIdentity(code);
  let changed = false;
  if (!identity.keyPair) {
    identity.keyPair = await generateRoomKeyPair();
    changed = true;
  }
  if (names?.nickname && names.nickname !== identity.nickname) {
    identity.nickname = names.nickname;
    changed = true;
  }
  if (names?.teamName && names.teamName !== identity.teamName) {
    identity.teamName = names.teamName;
    changed = true;
  }
  if (changed) write(code, identity);
  return identity;
}

/** Identità già salvata per il rientro (null se mai entrato da qui) */
export function savedRoomIdentity(code: string): RoomIdentity | null {
  return read(code);
}

export function clearRoomIdentity(code: string): void {
  try {
    localStorage.removeItem(keyFor(code));
  } catch {
    // niente da fare
  }
}
