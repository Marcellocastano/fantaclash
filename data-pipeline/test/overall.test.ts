import { describe, it, expect } from 'vitest';
import {
  percentileRank,
  shrunkRate,
  scaledProduction,
  minutesShare,
  computeOveralls,
  FULL_MINUTES,
  SHRINK_K,
} from '../src/derive/overall.ts';
import type { PlayerAgg } from '../src/derive/overall.ts';
import { concededShare, isCleanSheetAppearance, pickMainClub } from '../src/derive/aggregate.ts';
import { toGamePlayer } from '../src/derive/toGamePlayer.ts';

function agg(partial: Partial<PlayerAgg>): PlayerAgg {
  return {
    role: 'C',
    apps: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
    yellow: 0,
    red: 0,
    goalsConceded: 0,
    cleanSheets: 0,
    teamPPG: 0,
    teamGA: 0,
    ...partial,
  };
}

describe('percentileRank', () => {
  it('gestisce i pari merito con il midrank', () => {
    const values = [1, 2, 2, 2, 5];
    expect(percentileRank(values, 1)).toBeCloseTo(0.1); // midrank del minimo
    expect(percentileRank(values, 2)).toBeCloseTo((1 + 0.5 * 3) / 5); // 0.5
    expect(percentileRank(values, 5)).toBeCloseTo(4.5 / 5); // 0.9
    expect(percentileRank(values, 99)).toBeCloseTo(1);
  });

  it('su un solo elemento vale 0.5', () => {
    expect(percentileRank([7], 7)).toBeCloseTo(0.5);
  });
});

describe('shrunkRate', () => {
  it('con 0 minuti restituisce la media di ruolo', () => {
    expect(shrunkRate(0, 0, 0.4)).toBeCloseTo(0.4);
  });

  it('con tanti minuti tende al tasso reale (ma resta corretto)', () => {
    // 30 gol in 3000' = 0.9/90'; con K=15: (30+15*0.2)/(33.33+15) = 0.683
    const r = shrunkRate(30, 3000, 0.2);
    expect(r).toBeCloseTo((30 + SHRINK_K * 0.2) / (3000 / 90 + SHRINK_K));
    expect(r).toBeGreaterThan(0.2);
    expect(r).toBeLessThan(0.9);
  });

  it('K = 15', () => {
    expect(SHRINK_K).toBe(15);
  });
});

describe('scaledProduction', () => {
  it('radice del rapporto col massimo di ruolo', () => {
    expect(scaledProduction(36, 36)).toBeCloseTo(1);
    expect(scaledProduction(9, 36)).toBeCloseTo(0.5);
    expect(scaledProduction(0, 36)).toBe(0);
    expect(scaledProduction(5, 0)).toBe(0);
  });
});

describe('computeOveralls', () => {
  it('un bomber di 1 partita non batte un bomber di 30 partite e 15 gol', () => {
    // Campionato finto: 1 top (30 app, 15 gol), 1 meteora (1 app, 1 gol),
    // 16 comparse a 0 gol e tanti minuti per dare un contesto di ruolo
    const filler: PlayerAgg[] = Array.from({ length: 16 }, () =>
      agg({ role: 'A', apps: 30, minutes: 2700, goals: 0, assists: 0, teamPPG: 1, teamGA: 1 })
    );
    const star = agg({ role: 'A', apps: 30, minutes: 2700, goals: 15, assists: 5, teamPPG: 2, teamGA: 1 });
    const meteora = agg({ role: 'A', apps: 1, minutes: 90, goals: 1, assists: 0, teamPPG: 2, teamGA: 1 });
    const [oStar, oMeteora] = computeOveralls([star, meteora, ...filler]);
    expect(oStar).toBeGreaterThan(oMeteora);
  });

  it('i minuti grezzi contano: poche presenze non bastano a stare davanti', () => {
    // Stesso ruolo, stessa squadra: chi ha giocato 38 partite batte chi ne ha giocate 5
    const titolare = agg({ role: 'A', apps: 38, minutes: 3420, goals: 15, assists: 3, teamPPG: 1.5, teamGA: 1 });
    const panchina = agg({ role: 'A', apps: 5, minutes: 400, goals: 4, assists: 1, teamPPG: 1.5, teamGA: 1 });
    const altri: PlayerAgg[] = Array.from({ length: 10 }, () =>
      agg({ role: 'A', apps: 30, minutes: 2700, goals: 8, assists: 2, teamPPG: 1.5, teamGA: 1 })
    );
    const [o1, o2] = computeOveralls([titolare, panchina, ...altri]);
    expect(o1).toBeGreaterThan(o2);
  });

  it('formula P: portiere titolare di squadra forte batte la riserva', () => {
    const titolare = agg({ role: 'P', apps: 38, minutes: 3420, goalsConceded: 20, cleanSheets: 15, teamPPG: 2.2, teamGA: 0.6 });
    const riserva = agg({ role: 'P', apps: 5, minutes: 450, goalsConceded: 8, cleanSheets: 1, teamPPG: 1.0, teamGA: 1.8 });
    const [o1, o2] = computeOveralls([titolare, riserva]);
    expect(o1).toBeGreaterThan(o2);
    expect(o2).toBeGreaterThanOrEqual(50);
  });

  it('overall sempre in [50, 95] e migliore giocatore ha overall più alto', () => {
    const players = [
      agg({ role: 'D', apps: 38, minutes: 3420, goals: 3, assists: 4, teamPPG: 2.2, teamGA: 0.7 }),
      agg({ role: 'D', apps: 10, minutes: 900, goals: 0, assists: 0, teamPPG: 0.9, teamGA: 1.9 }),
    ];
    const [o1, o2] = computeOveralls(players);
    expect(o1).toBeGreaterThan(o2);
    for (const o of [o1, o2]) {
      expect(o).toBeGreaterThanOrEqual(50);
      expect(o).toBeLessThanOrEqual(95);
    }
  });
});

describe('helper di aggregazione', () => {
  it('concededShare: 2 gol su 90\' pesano 2, su 45\' pesano 1', () => {
    expect(concededShare(2, 90)).toBeCloseTo(2);
    expect(concededShare(2, 45)).toBeCloseTo(1);
    expect(concededShare(3, 120)).toBeCloseTo(3); // oltre 90' si clampa
  });

  it('isCleanSheetAppearance: serve >= 60\' e 0 gol subiti', () => {
    expect(isCleanSheetAppearance(0, 90)).toBe(true);
    expect(isCleanSheetAppearance(0, 59)).toBe(false);
    expect(isCleanSheetAppearance(1, 90)).toBe(false);
  });

  it('pickMainClub sceglie il club con più minuti', () => {
    const m = new Map<string, number>([['a', 500], ['b', 1500], ['c', 300]]);
    expect(pickMainClub(m)).toBe('b');
  });
});

describe('toGamePlayer', () => {
  const base = agg({ role: 'A', apps: 30, minutes: 2700, goals: 15, assists: 6, yellow: 3, red: 1 });

  it('overall 50 -> baseValue 1; overall 95 -> ROLE_MAX', () => {
    const low = toGamePlayer({ ...base, playerId: '1', name: 'X', clubName: 'T', overall: 50, seasonLabel: '2015-16' });
    expect(low.baseValue).toBe(1);
    const high = toGamePlayer({ ...base, playerId: '1', name: 'X', clubName: 'T', overall: 95, seasonLabel: '2015-16' });
    expect(high.baseValue).toBe(50); // ROLE_MAX.A
    const highP = toGamePlayer({ ...base, role: 'P', playerId: '1', name: 'X', clubName: 'T', overall: 95, seasonLabel: '2015-16' });
    expect(highP.baseValue).toBe(35); // ROLE_MAX.P
  });

  it('probabilità = conteggi / presenze; 0 se zero presenze', () => {
    const p = toGamePlayer({ ...base, playerId: '1', name: 'X', clubName: 'T', overall: 80, seasonLabel: '2015-16' });
    expect(p.goalProbability).toBeCloseTo(15 / 30);
    expect(p.assistProbability).toBeCloseTo(6 / 30);
    expect(p.yellowCardProbability).toBeCloseTo(3 / 30);
    expect(p.redCardProbability).toBeCloseTo(1 / 30);
    const zero = toGamePlayer({ ...base, apps: 0, minutes: 0, playerId: '2', name: 'Y', clubName: 'T', overall: 80, seasonLabel: '2015-16' });
    expect(zero.goalProbability).toBe(0);
  });

  it('cleanSheetProbability solo P e D; penaltySaveProbability = 0 solo P', () => {
    const gk = toGamePlayer({ ...base, role: 'P', cleanSheets: 10, playerId: '1', name: 'X', clubName: 'T', overall: 80, seasonLabel: '2015-16' });
    expect(gk.cleanSheetProbability).toBeCloseTo(10 / 30);
    expect(gk.penaltySaveProbability).toBe(0);
    const df = toGamePlayer({ ...base, role: 'D', cleanSheets: 10, playerId: '1', name: 'X', clubName: 'T', overall: 80, seasonLabel: '2015-16' });
    expect(df.cleanSheetProbability).toBeCloseTo(10 / 30);
    expect(df.penaltySaveProbability).toBeUndefined();
    const fw = toGamePlayer({ ...base, role: 'A', cleanSheets: 10, playerId: '1', name: 'X', clubName: 'T', overall: 80, seasonLabel: '2015-16' });
    expect(fw.cleanSheetProbability).toBeUndefined();
  });

  it('id e campi stagione/overall/stats', () => {
    const p = toGamePlayer({ ...base, playerId: '42', name: 'X', clubName: 'T', overall: 80, seasonLabel: '2015-16' });
    expect(p.id).toBe('tm-42-2015-16');
    expect(p.season).toBe('2015-16');
    expect(p.overall).toBe(80);
    expect(p.stats?.goals).toBe(15);
    expect(p.reliability).toBeCloseTo(Math.min(1, 2700 / FULL_MINUTES), 2);
    void SHRINK_K;
  });
});
