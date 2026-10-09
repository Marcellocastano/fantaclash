/**
 * Codice stanza: 5 caratteri da un alfabeto senza ambigui (niente 0, O, 1, I, L).
 */

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;

export function generateRoomCode(rng: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(rng() * ALPHABET.length)];
  }
  return code;
}

/**
 * Normalizza un input utente in codice stanza: trim, maiuscolo, senza
 * spazi né trattini. Restituisce null se non è un codice valido.
 */
export function normalizeRoomCode(input: string): string | null {
  const cleaned = input.trim().toUpperCase().replace(/[\s-]+/g, '');
  if (cleaned.length !== ROOM_CODE_LENGTH) return null;
  for (const ch of cleaned) {
    if (!ALPHABET.includes(ch)) return null;
  }
  return cleaned;
}
