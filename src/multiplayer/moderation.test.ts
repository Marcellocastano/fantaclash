import { describe, it, expect } from 'vitest';
import { isOffensiveName, normalizeForModeration } from './moderation';

describe('moderazione dei nomi', () => {
  it('blocca volgarità dirette e offuscate', () => {
    for (const name of [
      'cazzo', 'C4ZZ0', 'c a z z o', 'stronzo', 'str0nz0', 'troia',
      'puttana', 'vaffanculo', 'v4ff4ncul0', 'fuck', 'f u c k', 'shit',
      'n1gga', 'b1tch', 'cul0', 'minchia', 'm1nch14',
    ]) {
      expect(isOffensiveName(name), name).toBe(true);
    }
  });

  it('blocca la voce dentro un nome composto', () => {
    expect(isOffensiveName('Fanculo United')).toBe(true);
    expect(isOffensiveName('AS Cazzo')).toBe(true);
  });

  it('non blocca nomi innocui (falsi positivi)', () => {
    for (const name of [
      'Scunthorpe', 'Cagliari', 'Marco', 'Gabbia di matti', 'Perder Brema',
      'Bugs Burnley', 'Ciao Darwin', 'Lacazette in Canada', 'Atletico Minaccia',
      'Squadra Azzurra', 'Torino', 'Negroni FC',
    ]) {
      expect(isOffensiveName(name), name).toBe(false);
    }
  });

  it('normalizzazione: accenti, leet, punteggiatura', () => {
    expect(normalizeForModeration('V4ffàncul0').collapsed).toBe('vaffanculo');
    expect(normalizeForModeration('Càgl14r1').collapsed).toBe('cagliari');
  });
});
