import { describe, it, expect } from 'vitest';
import { tierOf } from './tier';

describe('fasce overall', () => {
  it('soglie 80 / 85 / 90', () => {
    expect(tierOf(73)).toBe('bronze');
    expect(tierOf(79)).toBe('bronze');
    expect(tierOf(80)).toBe('silver');
    expect(tierOf(84)).toBe('silver');
    expect(tierOf(85)).toBe('gold');
    expect(tierOf(89)).toBe('gold');
    expect(tierOf(90)).toBe('elite');
    expect(tierOf(95)).toBe('elite');
  });
});
