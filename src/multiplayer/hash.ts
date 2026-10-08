import { MatchResult } from '../domain/match';
import type { RoomState } from './protocol';

/**
 * Hash stabile dello stato di stanza: serve a client e host per
 * verificare di avere lo stesso mondo dopo la stessa sequenza di azioni.
 * FNV-1a 32 bit su una serializzazione canonica (chiavi ordinate).
 * Non è crittografico: rileva divergenze, non attacchi.
 */

/** Serializzazione canonica: chiavi ordinate, undefined omessi */
export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = canonicalize(v);
    }
    return out;
  }
  return value;
}

/** FNV-1a 32 bit in esadecimale (8 cifre) */
export function stableHash(value: unknown): string {
  const s = stableStringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Hash dello stato di stanza completo */
export function stateHash(state: RoomState): string {
  return stableHash(state);
}

/**
 * Hash di un risultato di partita per la verifica di MATCH_RECORD.
 * Ridotto ai campi deterministici e confrontabili: esclude `ticks` e
 * `ball` (Math.tanh può differire tra browser) e i testi degli eventi.
 */
export function resultHash(result: MatchResult): string {
  return stableHash({
    homeTeamId: result.homeTeamId,
    awayTeamId: result.awayTeamId,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    shootout: result.shootout,
    winnerId: result.winnerId,
    events: result.events.map(e => ({ type: e.type, tick: e.tick, side: e.side })),
  });
}
