import { describe, it, expect } from 'vitest';
import { generateRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } from './roomCode';
import { createRng } from '../services/auction';

describe('roomCode', () => {
  it('genera codici di 5 caratteri dall’alfabeto senza ambigui', () => {
    const rng = createRng(1);
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode(rng);
      expect(code).toHaveLength(ROOM_CODE_LENGTH);
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it('normalizza minuscole, spazi e trattini', () => {
    expect(normalizeRoomCode('abc23')).toBe('ABC23');
    expect(normalizeRoomCode(' abc-23 ')).toBe('ABC23');
    expect(normalizeRoomCode('A B C 2 3')).toBe('ABC23');
  });

  it('rifiuta lunghezze sbagliate e caratteri ambigui', () => {
    expect(normalizeRoomCode('ABC')).toBeNull();
    expect(normalizeRoomCode('ABCDEF')).toBeNull();
    expect(normalizeRoomCode('ABCD0')).toBeNull();
    expect(normalizeRoomCode('ABCDO')).toBeNull();
    expect(normalizeRoomCode('ABCD1')).toBeNull();
    expect(normalizeRoomCode('ABCDI')).toBeNull();
    expect(normalizeRoomCode('ABCDL')).toBeNull();
    expect(normalizeRoomCode('')).toBeNull();
  });
});
