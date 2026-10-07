import { describe, it, expect } from 'vitest';
import {
  FANTA_CONFIG,
  fantavoto,
  computeFantaGroup,
  midrankPercentile,
  overallToBaseValue,
} from '../src/derive/fantaOverall.ts';
import type { FantaRow } from '../src/derive/fantaOverall.ts';
import {
  parseCsv,
  parseNum,
  parseRig,
  normalizeName,
  findStatsMatch,
} from '../src/build/fantaCsv.ts';

function row(partial: Partial<FantaRow>): FantaRow {
  return {
    season: '2015-2016',
    club: 'X',
    role: 'A',
    name: 'X',
    mv: 6,
    go: 0,
    assists: 0,
    yellow: 0,
    red: 0,
    ownGoals: 0,
    penScored: 0,
    penTaken: 0,
    pr: 30,
    ti: 25,
    qu: 10,
    ...partial,
  };
}

describe('fantavoto — movimento', () => {
  it('bonus/malus divisi per le presenze con voto', () => {
    // MV 6 + (3*1 + 1*1 - 0.5*1) / 2 = 6 + 1.75 = 7.75
    expect(fantavoto(row({ mv: 6, go: 1, assists: 1, yellow: 1, pr: 2 }))).toBeCloseTo(7.75);
  });

  it('rigori sbagliati = calciati - realizzati', () => {
    // MV 6 + (3*2 - 3*(5-3)) / 10 = 6 + 0 = 6
    expect(fantavoto(row({ mv: 6, go: 2, penScored: 3, penTaken: 5, pr: 10 }))).toBeCloseTo(6);
  });

  it('autogol -2 e rosso -1', () => {
    expect(fantavoto(row({ mv: 6, ownGoals: 1, red: 1, pr: 3 }))).toBeCloseTo(6 - 1);
  });

  it('gol negativi per non portieri contano come 0', () => {
    expect(fantavoto(row({ mv: 6, go: -2, pr: 4 }))).toBeCloseTo(6);
  });
});

describe('fantavoto — portiere', () => {
  it('gol subiti negativi e rigori parati', () => {
    // MV 6 + (-17 + 3*2 - 0.5*1) / 5 = 6 - 2.3 = 3.7
    const gk = row({ role: 'P', mv: 6, go: -17, penScored: 2, penTaken: 3, yellow: 1, pr: 5 });
    expect(fantavoto(gk)).toBeCloseTo(6 + (-17 + 6 - 0.5) / 5);
  });

  it('Go positivo per un portiere non conta', () => {
    const gk = row({ role: 'P', mv: 6, go: 3, pr: 3 });
    expect(fantavoto(gk)).toBeCloseTo(6);
  });
});

describe('computeFantaGroup', () => {
  it('shrinkage: 1 presenza con MV altissima non batte un titolare solido', () => {
    const titolare = row({ name: 'T', mv: 7, pr: 35, ti: 35 });
    const meteora = row({ name: 'M', mv: 9, pr: 1, ti: 1 });
    const filler = Array.from({ length: 10 }, (_, i) =>
      row({ name: `F${i}`, mv: 6, pr: 30, ti: 28 })
    );
    const [rT, rM] = computeFantaGroup([titolare, meteora, ...filler]);
    // il meteora è tirato verso la media: FV* molto minore del suo FV
    expect(rM.fvStar).toBeLessThan(rM.fv);
    expect(rT.overall).toBeGreaterThan(rM.overall);
  });

  it('prod = 0 se il massimo del gruppo è 0', () => {
    const rows = [
      row({ name: 'a', mv: 7 }),
      row({ name: 'b', mv: 5 }),
    ];
    const res = computeFantaGroup(rows);
    expect(res.every(r => r.prod === 0)).toBe(true);
  });

  it('overall sempre in [50, 95]', () => {
    const rows = [
      row({ name: 'top', mv: 9, go: 30, assists: 10, pr: 38, ti: 38 }),
      row({ name: 'mid', mv: 6.2, go: 5, pr: 30, ti: 28 }),
      row({ name: 'low', mv: 5.5, go: 0, pr: 10, ti: 8 }),
    ];
    const res = computeFantaGroup(rows);
    for (const r of res) {
      expect(r.overall).toBeGreaterThanOrEqual(50);
      expect(r.overall).toBeLessThanOrEqual(95);
    }
    expect(res[0].overall).toBeGreaterThan(res[2].overall);
  });

  it('percentile midrank con pari merito', () => {
    expect(midrankPercentile([1, 2, 2, 2, 5], 2)).toBeCloseTo(0.5);
    expect(midrankPercentile([1, 2, 2, 2, 5], 5)).toBeCloseTo(0.9);
    expect(midrankPercentile([], 1)).toBe(0);
  });

  it('cont = min(1, Ti/38)', () => {
    const res = computeFantaGroup([row({ ti: 19 }), row({ ti: 40, name: 'b' })]);
    expect(res[0].cont).toBeCloseTo(0.5);
    expect(res[1].cont).toBe(1);
  });

  it('magnitudine: un primo con largo margine ha q nettamente maggiore del secondo', () => {
    // Stesso numero di giocatori sotto entrambi: con il solo percentile
    // il 1° e il 2° disterebbero ~1/n; la magnitudine conserva il margine.
    const dominante = row({ name: 'DOM', mv: 9, go: 30, pr: 38, ti: 38 });
    const secondo = row({ name: 'SEC', mv: 6.5, go: 3, pr: 35, ti: 35 });
    const fillers = Array.from({ length: 20 }, (_, i) =>
      row({ name: `F${i}`, mv: 6.2, pr: 30, ti: 28 })
    );
    const res = computeFantaGroup([dominante, secondo, ...fillers]);
    const [rDom, rSec] = res;
    const n = res.length;
    const pctGap = 1 / n; // distanza in percentile tra posizioni adiacenti
    expect(rDom.q - rSec.q).toBeGreaterThan(3 * pctGap);
    expect(rDom.q).toBeGreaterThan(0.9);
  });

  it('produzione dei difensori: a parità di FV più gol+assist -> più overall', () => {
    const scorer = row({ role: 'D', name: 'D-GOL', mv: 6.5, go: 5, assists: 3, pr: 30, ti: 30 });
    const plain = row({ role: 'D', name: 'D-OK', mv: 6.5, go: 0, assists: 0, pr: 30, ti: 30 });
    const fillers = Array.from({ length: 8 }, (_, i) =>
      row({ role: 'D', name: `D${i}`, mv: 6, pr: 30, ti: 28 })
    );
    const res = computeFantaGroup([scorer, plain, ...fillers]);
    expect(res[0].prod).toBeGreaterThan(res[1].prod);
    expect(res[0].overall).toBeGreaterThan(res[1].overall);
  });

  describe('reputazione', () => {
    it('quotazione più alta -> overall più alto a parità di statistiche', () => {
      const caro = row({ name: 'CARO', mv: 6.5, pr: 30, ti: 30, qu: 40 });
      const cheap = row({ name: 'CHEAP', mv: 6.5, pr: 30, ti: 30, qu: 5 });
      const fillers = Array.from({ length: 8 }, (_, i) =>
        row({ name: `F${i}`, mv: 6, pr: 30, ti: 28, qu: 10 })
      );
      const [rCaro, rCheap] = computeFantaGroup([caro, cheap, ...fillers]);
      expect(rCaro.rep).toBeGreaterThan(rCheap.rep);
      expect(rCaro.overall).toBeGreaterThan(rCheap.overall);
    });

    it('con qi la reputazione media quotazione finale e iniziale', () => {
      // Stessa quotazione finale (la massima): chi aveva una quotazione
      // iniziale bassa paga la media con qi, chi non è nel listone usa solo qu
      const conQiBassa = row({ name: 'CONQI', mv: 6.5, pr: 30, ti: 30, qu: 20, qi: 4 });
      const senzaQi = row({ name: 'NOQI', mv: 6.5, pr: 30, ti: 30, qu: 20 });
      const fillers = Array.from({ length: 8 }, (_, i) =>
        row({ name: `F${i}`, mv: 6, pr: 30, ti: 28, qu: 10, qi: 10 })
      );
      const [rCon, rSenza] = computeFantaGroup([conQiBassa, senzaQi, ...fillers]);
      // rep = 0.5*sqrt(20/20) + 0.5*sqrt(4/10) < sqrt(20/20) = rep senza qi
      expect(rCon.rep).toBeCloseTo(0.5 + 0.5 * Math.sqrt(4 / 10));
      expect(rCon.rep).toBeLessThan(rSenza.rep);
    });

    it('perf e rep sono sempre in [0,1]', () => {
      const rows = [
        row({ name: 'a', mv: 9, go: 30, pr: 38, ti: 38, qu: 50, qi: 45 }),
        row({ name: 'b', mv: 6, pr: 30, ti: 28, qu: 10 }),
        row({ name: 'c', mv: 5, pr: 5, ti: 4, qu: 1 }),
      ];
      for (const r of computeFantaGroup(rows)) {
        expect(r.perf).toBeGreaterThanOrEqual(0);
        expect(r.perf).toBeLessThanOrEqual(1);
        expect(r.rep).toBeGreaterThanOrEqual(0);
        expect(r.rep).toBeLessThanOrEqual(1);
      }
    });
  });
});

describe('overallToBaseValue', () => {
  it('estremi: overall 50 -> 1, overall 95 -> ROLE_MAX', () => {
    expect(overallToBaseValue(50, 'A')).toBe(1);
    expect(overallToBaseValue(95, 'A')).toBe(FANTA_CONFIG.ROLE_MAX.A);
    expect(overallToBaseValue(95, 'P')).toBe(FANTA_CONFIG.ROLE_MAX.P);
  });
  it('quadratico: t=0.5 -> ~25% del max', () => {
    const ov = Math.round(50 + 45 * 0.5); // 73 (t ~ 0.5)
    const bv = overallToBaseValue(ov, 'C');
    expect(bv).toBeGreaterThan(5);
    expect(bv).toBeLessThan(15);
  });
});

describe('parsing CSV fantacalcio', () => {
  it('BOM, decimali con virgola, campi quotati', () => {
    const csv = '﻿Squadra,Ruolo,Calciatore,MV,Go\nRoma,A,"TOTTI F.","6,43",26\n';
    const rows = parseCsv(csv);
    expect(rows[0][0]).toBe('Squadra');
    expect(rows[1][2]).toBe('TOTTI F.');
  });

  it('parseNum: virgola decimale, "-", vuoto', () => {
    expect(parseNum('5,83')).toBeCloseTo(5.83);
    expect(parseNum('-')).toBe(0);
    expect(parseNum('')).toBe(0);
    expect(parseNum('-5')).toBe(-5);
  });

  it('parseRig: "1/3", "-/2", "-/-"', () => {
    expect(parseRig('1/3')).toEqual({ scored: 1, taken: 3 });
    expect(parseRig('-/2')).toEqual({ scored: 0, taken: 2 });
    expect(parseRig('-/-')).toEqual({ scored: 0, taken: 0 });
  });
});

describe('join listone -> stats', () => {
  const group: FantaRow[] = [
    row({ name: 'HIGUAIN Gonzalo Gera.', club: 'Napoli' }),
    row({ name: 'ROSSI Marco', club: 'Genoa' }),
    row({ name: 'ROSSI Marco', club: 'Genoa' }),
  ];

  it('nome troncato: match per prefisso', () => {
    const m = findStatsMatch('HIGUAIN Gonzalo', group);
    expect(m?.name).toBe('HIGUAIN Gonzalo Gera.');
  });

  it('normalizzazione: accenti, apostrofi, punti', () => {
    expect(normalizeName("D'Ambrosio Danìlo")).toBe('DAMBROSIO DANILO');
    expect(normalizeName('Gera.')).toBe('GERA');
  });

  it('omonimi: stesso cognome non unico -> null', () => {
    expect(findStatsMatch('ROSSI Mario', group)).toBeNull();
  });

  it('cognome unico nel club+ruolo -> match', () => {
    const g = [row({ name: 'BUFFON Gianluigi' })];
    expect(findStatsMatch('BUFFON G.', g)?.name).toBe('BUFFON Gianluigi');
  });
});

describe('FANTA_CONFIG', () => {
  it('espone le costanti della formula', () => {
    expect(FANTA_CONFIG.SHRINK_K).toBe(8);
    expect(FANTA_CONFIG.VALUE_EXPONENT).toBe(2);
    expect(FANTA_CONFIG.Q_PCT_WEIGHT).toBeGreaterThan(0);
    expect(FANTA_CONFIG.Q_PCT_WEIGHT).toBeLessThan(1);
    // PERF + REP coprono l'intero score
    expect(FANTA_CONFIG.PERF_WEIGHT + FANTA_CONFIG.REP_WEIGHT).toBeCloseTo(1);
    // I pesi del rendimento sommano a 1 per ogni ruolo
    for (const role of ['P', 'D', 'C', 'A'] as const) {
      const w = FANTA_CONFIG.SCORE_WEIGHTS[role];
      expect(w.q + w.prod + w.cont).toBeCloseTo(1);
    }
    // Il portiere non ha produzione offensiva
    expect(FANTA_CONFIG.SCORE_WEIGHTS.P.prod).toBe(0);
  });
});
