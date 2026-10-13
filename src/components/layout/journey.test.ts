import { describe, it, expect } from 'vitest';
import { journeyStep, journeySteps } from './journey';

describe('percorso di gioco (navbar)', () => {
  it('mostra formazione e avanzamento della competizione scelta', () => {
    expect(journeyStep('SETUP')).toBeNull();
    expect(journeyStep('ASTA')).toBe(0);
    expect(journeyStep('FORMAZIONE')).toBe(1);
    expect(journeyStep('TORNEO', 'draw')).toBe(2);
    expect(journeyStep('TORNEO', 'quarterfinals')).toBe(3);
    expect(journeyStep('TORNEO', 'semifinals')).toBe(4);
    expect(journeyStep('TORNEO', 'final')).toBe(5);
    expect(journeyStep('TORNEO', 'completed')).toBe(6);
    expect(journeyStep('FINALE')).toBe(6);
    expect(journeyStep('TORNEO', 'groups', 'groups')).toBe(3);
    expect(journeySteps('groups')).toContain('Gironi');
  });
});
