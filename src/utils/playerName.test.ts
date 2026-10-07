import { describe, it, expect } from 'vitest';
import { shortName, splitName, titleCase } from './playerName';

describe('nomi dei giocatori', () => {
  it('apostrofo: maiuscola solo dopo un\'elisione', () => {
    expect(shortName("ETO'O Samuel")).toBe("Eto'o");
    expect(shortName("D'AMBROSIO Danilo")).toBe("D'Ambrosio");
    expect(shortName("KAKA' Ricardo Izecso.")).toBe("Kaka'");
    expect(shortName("BUSCE' Antonio")).toBe("Busce'");
    expect(titleCase("L'AQUILA")).toBe("L'Aquila");
  });

  it('cognomi composti e formato già leggibile', () => {
    expect(shortName('DE ROSSI Daniele')).toBe('De Rossi');
    expect(shortName('MILINKOVIC-SAVIC Sergej')).toBe('Milinkovic-Savic');
    expect(shortName('Mike Maignan')).toBe('Maignan');
    expect(splitName('HIGUAIN Gonzalo')).toEqual({ surname: 'Higuain', firstName: 'Gonzalo' });
    expect(splitName('Mike Maignan')).toEqual({ surname: 'Maignan', firstName: 'Mike' });
  });
});
