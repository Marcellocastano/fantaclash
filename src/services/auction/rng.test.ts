import { describe, it, expect } from 'vitest';
import { createRng, hashSeed, pickWeighted, shuffle } from './rng';

describe('rng', () => {
  it('createRng è deterministico a parità di seme', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it('semi diversi producono sequenze diverse', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('produce valori in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('hashSeed è stabile e dipende da tutte le parti', () => {
    expect(hashSeed('a', 1, 'b')).toBe(hashSeed('a', 1, 'b'));
    expect(hashSeed('a', 1, 'b')).not.toBe(hashSeed('a', 2, 'b'));
    expect(hashSeed('a', 1, 'b')).not.toBe(hashSeed('b', 1, 'a'));
    expect(hashSeed('x')).toBeGreaterThanOrEqual(0);
  });

  it('pickWeighted ignora i pesi <= 0', () => {
    const rng = createRng(3);
    for (let i = 0; i < 50; i++) {
      expect(pickWeighted(['a', 'b', 'c'], [0, 1, -5], rng)).toBe('b');
    }
  });

  it('pickWeighted con tutti i pesi <= 0 sceglie uniformemente', () => {
    const rng = createRng(11);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(pickWeighted(['a', 'b', 'c'], [0, 0, 0], rng));
    }
    expect(seen.size).toBe(3);
  });

  it('pickWeighted rispetta i pesi', () => {
    const rng = createRng(5);
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 1000; i++) {
      counts[pickWeighted(['a', 'b'], [9, 1], rng) as 'a' | 'b']++;
    }
    expect(counts.a).toBeGreaterThan(counts.b * 3);
  });

  it('shuffle restituisce una permutazione senza modificare l\'originale', () => {
    const rng = createRng(9);
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...items];
    const shuffled = shuffle(items, rng);
    expect(items).toEqual(copy);
    expect(shuffled.sort()).toEqual([...copy].sort());
  });
});
