import { stableStringify } from './hash';

/**
 * Firma dei messaggi di stanza: ECDSA P-256 / SHA-256 via WebCrypto.
 * Ogni partecipante ha una coppia di chiavi; la pubblica (JWK) è fissata
 * al primo ingresso (trust-on-first-use). Le chiavi sono tenute come JWK
 * serializzabili: la privata non lascia mai il browser del proprietario
 * (solo il salvataggio locale dell'host per la ripresa della stanza).
 *
 * La firma copre `stableStringify(msg)`: `from` è implicito perché la
 * chiave è legata al partecipante.
 */

const ECDSA_PARAMS: EcKeyGenParams = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN_PARAMS: EcdsaParams = { name: 'ECDSA', hash: 'SHA-256' };

export interface RoomKeyPair {
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
}

function subtle(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new Error('WebCrypto non disponibile');
  return globalThis.crypto.subtle;
}

export async function generateRoomKeyPair(): Promise<RoomKeyPair> {
  const pair = await subtle().generateKey(ECDSA_PARAMS, true, ['sign', 'verify']);
  const [publicJwk, privateJwk] = await Promise.all([
    subtle().exportKey('jwk', pair.publicKey),
    subtle().exportKey('jwk', pair.privateKey),
  ]);
  return { publicJwk, privateJwk };
}

// Importa una volta per chiave: importKey è la parte costosa
const keyCache = new Map<string, Promise<CryptoKey>>();

function importKey(jwk: JsonWebKey, usage: KeyUsage): Promise<CryptoKey> {
  const cacheKey = usage + JSON.stringify(jwk);
  let p = keyCache.get(cacheKey);
  if (!p) {
    p = subtle().importKey('jwk', jwk, ECDSA_PARAMS, false, [usage]);
    keyCache.set(cacheKey, p);
  }
  return p;
}

function toBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toB64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export async function signPayload(privateJwk: JsonWebKey, msg: unknown): Promise<string> {
  const key = await importKey(privateJwk, 'sign');
  const data = new TextEncoder().encode(stableStringify(msg));
  const sig = await subtle().sign(SIGN_PARAMS, key, data as BufferSource);
  return toB64(new Uint8Array(sig));
}

export async function verifyPayload(publicJwk: JsonWebKey, sig: string, msg: unknown): Promise<boolean> {
  try {
    const key = await importKey(publicJwk, 'verify');
    const data = new TextEncoder().encode(stableStringify(msg));
    return await subtle().verify(SIGN_PARAMS, key, toBytes(sig) as BufferSource, data as BufferSource);
  } catch {
    return false;
  }
}

/** Chiavi pubbliche JWK identiche? (confronto canonico) */
export function sameKey(a: JsonWebKey | undefined, b: JsonWebKey | undefined): boolean {
  if (!a || !b) return false;
  return stableStringify(a) === stableStringify(b);
}

/** Coda di verifica per mittente: mantiene l'ordine di applicazione */
export function serialQueue(): (fn: () => Promise<void>) => void {
  let chain = Promise.resolve();
  return (fn) => {
    chain = chain.then(fn, fn);
  };
}
