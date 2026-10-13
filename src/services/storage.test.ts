import { describe, it, expect } from 'vitest';
import { sanitizeGameState } from './storage';
import { createTestGameConfig } from '../test/testUtils';

const config = createTestGameConfig();
const completeAuction = { phase: 'complete' } as never;

describe('sanitizeGameState', () => {
  it('accetta uno stato valido', () => {
    const s = { phase: 'ASTA', config, teams: [], auction: null, tournament: null };
    expect(sanitizeGameState(s)).toEqual(s);
  });

  it('fase sconosciuta con asta finita -> torna alla formazione', () => {
    const s = { phase: 'CAMPIONATO', config, teams: [], auction: completeAuction, calendar: [] };
    const out = sanitizeGameState(s);
    expect(out?.phase).toBe('FORMAZIONE');
    expect(out?.tournament).toBeNull();
  });

  it("riprende la fase di formazione dopo un'asta completa", () => {
    const s = { phase: 'FORMAZIONE', config, teams: [], auction: completeAuction, tournament: null };
    expect(sanitizeGameState(s)).toEqual(s);
  });

  it("TORNEO senza torneo -> formazione, oppure null se l'asta non è finita", () => {
    expect(sanitizeGameState({ phase: 'TORNEO', config, teams: [], auction: completeAuction })?.phase).toBe('FORMAZIONE');
    expect(sanitizeGameState({ phase: 'TORNEO', config, teams: [], auction: null })).toBeNull();
  });

  it('dati corrotti -> null', () => {
    expect(sanitizeGameState(null)).toBeNull();
    expect(sanitizeGameState({ phase: 3 })).toBeNull();
    expect(sanitizeGameState({ phase: 'ASTA', teams: [] })).toBeNull();
  });
});
