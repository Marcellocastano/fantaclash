import { describe, expect, it } from 'vitest';
import { teamFromRank } from '../../test/matchFixtures';
import { eventDescription } from '../../i18n/eventText';
import { t } from '../../i18n/translate';
import { simulateMatch } from './index';
import { MatchEvent } from './matchTypes';

const MID = teamFromRank('mid', 4);
const OPP = teamFromRank('opp', 5);

/**
 * Cronaca semanticamente localizzabile: gli eventi portano chiave/parametri/
 * variante, il testo si compone al render. Nessuna stringa localizzata entra
 * nel risultato, quindi hash e determinismo non cambiano.
 */
describe('cronaca localizzabile', () => {
  it('ogni evento ha descKey e il testo si compone via catalogo', () => {
    const r = simulateMatch({ home: MID, away: OPP, seed: 7 });
    expect(r.events.length).toBeGreaterThan(0);
    for (const e of r.events) {
      expect(e.descKey, `evento ${e.type}`).toBeTruthy();
      expect(e.description).toBeUndefined();
      expect(eventDescription(e, t).length).toBeGreaterThan(0);
    }
  });

  it('stesso seme -> stessa variante di cronaca', () => {
    const a = simulateMatch({ home: MID, away: OPP, seed: 42 });
    const b = simulateMatch({ home: MID, away: OPP, seed: 42 });
    for (let i = 0; i < a.events.length; i++) {
      expect(b.events[i].descKey).toBe(a.events[i].descKey);
      expect(b.events[i].descVariant).toBe(a.events[i].descVariant);
      expect(eventDescription(b.events[i], t)).toBe(eventDescription(a.events[i], t));
    }
  });

  it('il risultato non contiene testo localizzato (hash-safe)', () => {
    const r = simulateMatch({ home: MID, away: OPP, seed: 11 });
    const json = JSON.stringify(r.events);
    expect(json).not.toMatch(/Calcio d'inizio|Fischio finale|Gol di/);
  });

  it('le frasi di catalogo coprono le varianti richieste dal motore', () => {
    const r = simulateMatch({ home: MID, away: OPP, seed: 7 });
    for (const e of r.events) {
      const rendered = eventDescription(e, t);
      // una chiave/variante mancante restituirebbe la chiave stessa (match.event.*)
      expect(rendered).not.toMatch(/^match\.event\./);
    }
  });

  it('retrocompatibilità: eventi con sola description si leggono ancora', () => {
    const legacy = { description: 'Gol di R. Baggio!' } as MatchEvent;
    expect(eventDescription(legacy, t)).toBe('Gol di R. Baggio!');
    const empty = {} as MatchEvent;
    expect(eventDescription(empty, t)).toBe('');
  });

  it('interpolazione corretta su punteggi e nomi', () => {
    const r = simulateMatch({ home: MID, away: OPP, seed: 7 });
    const fullTime = r.events.find(e => e.type === 'full_time')!;
    const rendered = eventDescription(fullTime, t);
    expect(rendered).toMatch(/\d+ - \d+/);
    expect(rendered).not.toMatch(/\{\w+\}/);
  });
});
