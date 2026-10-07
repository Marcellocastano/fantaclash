import { describe, it, expect } from 'vitest';
import { spearman } from './balanceHarness';

describe('spearman', () => {
  it('correlazione perfetta = 1', () => {
    expect(spearman([1, 2, 3, 4, 5], [10, 20, 30, 40, 50])).toBeCloseTo(1);
    expect(spearman([5, 4, 3, 2, 1], [50, 40, 30, 20, 10])).toBeCloseTo(1);
  });

  it('correlazione perfetta inversa = -1', () => {
    expect(spearman([1, 2, 3, 4, 5], [50, 40, 30, 20, 10])).toBeCloseTo(-1);
  });

  it('serie costante -> 0', () => {
    expect(spearman([1, 1, 1, 1], [1, 2, 3, 4])).toBe(0);
    expect(spearman([1, 2, 3, 4], [7, 7, 7, 7])).toBe(0);
    expect(spearman([], [])).toBe(0);
  });

  it('pari merito: rango medio', () => {
    // Due pari merito nella prima serie: la correlazione resta < 1 ma alta
    const rho = spearman([1, 2, 2, 4, 5], [1, 2, 3, 4, 5]);
    expect(rho).toBeGreaterThan(0.9);
    expect(rho).toBeLessThan(1);
    // Pari merito completo in entrambe -> NaN-free, 0
    expect(spearman([2, 2, 2], [3, 3, 3])).toBe(0);
  });
});
