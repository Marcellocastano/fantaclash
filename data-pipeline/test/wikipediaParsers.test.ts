import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseStatsSection,
  parseRosaSection,
  statsMetrics,
  matchRate,
  normalizeName,
} from '../src/recon/wikipediaParsers.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const romaStats = readFileSync(join(FIXTURES, 'roma-2006-07-stats.wikitext'), 'utf8');
const romaRosa = readFileSync(join(FIXTURES, 'roma-2006-07-rosa.wikitext'), 'utf8');
const chievoStats = readFileSync(join(FIXTURES, 'chievo-2002-03-stats.wikitext'), 'utf8');

describe('parseStatsSection — Roma 2006-2007', () => {
  const stats = parseStatsSection(romaStats);

  it('rileva il template e le competizioni in ordine', () => {
    expect(stats.hasStatsTemplate).toBe(true);
    expect(stats.competitions).toEqual([
      'Serie A',
      'Coppa Italia',
      'Champions League',
      'Supercoppa italiana',
    ]);
    expect(stats.serieAIndex).toBe(0);
  });

  it('Totti: Serie A = 35 presenze, 26 reti, 2 gialli, 1 rosso', () => {
    const totti = stats.rows.find(r => r.name === 'Francesco Totti');
    expect(totti).toBeDefined();
    expect(totti!.numbers.slice(0, 4)).toEqual([35, 26, 2, 1]);
  });

  it('Doni (portiere): reti Serie A negative = -25', () => {
    const doni = stats.rows.find(r => normalizeName(r.name).includes('doni'));
    expect(doni).toBeDefined();
    expect(doni!.numbers[0]).toBe(32);
    expect(doni!.numbers[1]).toBe(-25);
  });

  it('Montella è in corsivo (ceduto a stagione in corso)', () => {
    const montella = stats.rows.find(r => r.name === 'Vincenzo Montella');
    expect(montella).toBeDefined();
    expect(montella!.leftMidSeason).toBe(true);
    const totti = stats.rows.find(r => r.name === 'Francesco Totti');
    expect(totti!.leftMidSeason).toBe(false);
  });

  it('metriche aggregate', () => {
    const m = statsMetrics(stats);
    expect(m.hasStats).toBe(true);
    expect(m.statsRows).toBe(28);
    expect(m.rowsWithBadArity).toBe(0);
    expect(m.serieAGoalsNegativeSum).toBeLessThan(0);
  });
});

describe('parseRosaSection — Roma 2006-2007', () => {
  const rosa = parseRosaSection(romaRosa);

  it('conta solo le voci giocatore (non inizio/medio/fine)', () => {
    expect(rosa.length).toBe(35);
    expect(rosa.every(e => e.name !== '')).toBe(true);
  });

  it('ruoli corretti: Totti A, Curci P', () => {
    expect(rosa.find(e => e.name === 'Francesco Totti')?.ruolo).toBe('A');
    expect(rosa.find(e => e.name === 'Gianluca Curci')?.ruolo).toBe('P');
  });

  it('estrae linkTarget dai wikilink', () => {
    const montella = rosa.find(e => e.linkTarget === 'Vincenzo Montella');
    expect(montella).toBeDefined();
    expect(montella!.name).toBe('Vincenzo Montella');
  });

  it('matchRate rosa vs stats è alto', () => {
    const stats = parseStatsSection(romaStats);
    expect(matchRate(stats, rosa)).toBeGreaterThanOrEqual(0.9);
  });
});

describe('parseStatsSection — ChievoVerona 2002-2003 (segnaposto "-")', () => {
  const stats = parseStatsSection(chievoStats);

  it('competizioni', () => {
    expect(stats.hasStatsTemplate).toBe(true);
    expect(stats.competitions[0]).toBe('Serie A');
    expect(stats.serieAIndex).toBe(0);
  });

  it('i "-" preservano i blocchi: Aquaro 0 presenze in Serie A', () => {
    const aquaro = stats.rows.find(r => r.name === 'Giuseppe Aquaro');
    expect(aquaro).toBeDefined();
    expect(aquaro!.numbers.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(aquaro!.leftMidSeason).toBe(true);
  });

  it('Bierhoff: 26 presenze, 7 reti in Serie A', () => {
    const bierhoff = stats.rows.find(r => r.name === 'Oliver Bierhoff');
    expect(bierhoff!.numbers.slice(0, 4)).toEqual([26, 7, 1, 1]);
  });
});

describe('normalizeName', () => {
  it('rimuove diacritici, normalizza spazi e case', () => {
    expect(normalizeName('  Mirko  Vučinić ')).toBe('mirko vucinic');
    expect(normalizeName('Nicolò')).toBe('nicolo');
  });
});
