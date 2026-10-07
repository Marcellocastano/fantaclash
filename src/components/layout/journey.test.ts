import { describe, it, expect } from 'vitest';
import { journeyStep } from './journey';

describe('percorso di gioco (navbar)', () => {
  it('segue fase e stato del torneo', () => {
    expect(journeyStep('SETUP')).toBeNull();
    expect(journeyStep('ASTA')).toBe(0);
    expect(journeyStep('TORNEO', 'draw')).toBe(1);
    expect(journeyStep('TORNEO', 'quarterfinals')).toBe(2);
    expect(journeyStep('TORNEO', 'semifinals')).toBe(3);
    expect(journeyStep('TORNEO', 'final')).toBe(4);
    expect(journeyStep('TORNEO', 'completed')).toBe(5);
    expect(journeyStep('FINALE')).toBe(5);
  });
});
