import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadStatsRows,
  loadListone,
  findStatsMatch,
  STATS_CSV,
  LISTONE_DIR,
} from '../src/build/fantaCsv.ts';
import { computeFantaGroup } from '../src/derive/fantaOverall.ts';
import type { FantaRole } from '../src/derive/fantaOverall.ts';
import type { Player } from '../../src/types/index.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEASONS_DIR = join(ROOT, 'public', 'data', 'seasons');
const ROLES: FantaRole[] = ['P', 'D', 'C', 'A'];
const EXPECTED: Record<FantaRole, number> = { P: 12, D: 24, C: 36, A: 24 };

function seasonLabel(season: string): string {
  const y = parseInt(season.slice(0, 4), 10);
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

const statsRows = loadStatsRows(join(ROOT, STATS_CSV));
const seasons = [...new Set(statsRows.map(r => r.season))].sort();
const index = JSON.parse(readFileSync(join(SEASONS_DIR, 'index.json'), 'utf8')) as {
  season: string;
  label: string;
  playerCount: number;
}[];

function loadSeasonDoc(label: string): { players: Player[] } {
  return JSON.parse(readFileSync(join(SEASONS_DIR, `${label}.json`), 'utf8'));
}

/** Spearman rank correlation tra due vettori (tie -> rango medio). */
function spearman(xs: number[], ys: number[]): number {
  const rank = (v: number[]) => {
    const order = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
    const r = new Array<number>(v.length);
    let i = 0;
    while (i < order.length) {
      let j = i;
      while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[order[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const n = xs.length;
  const mx = rx.reduce((a, b) => a + b, 0) / n;
  const my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  return dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : 0;
}

const FORBIDDEN_KEYS = /^(mv|mp|qu|fv|fvstar|fantasquadra|quotazione|quotazioneiniziale|quotazionefinale|renda|resa)$/i;

function collectKeys(obj: unknown, acc: Set<string>): void {
  if (Array.isArray(obj)) {
    for (const v of obj) collectKeys(v, acc);
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [k, v] of Object.entries(obj)) {
      acc.add(k);
      collectKeys(v, acc);
    }
  }
}

describe('stagioni fantacalcio — struttura', () => {
  it('index.json contiene tutte le 23 stagioni in ordine', () => {
    expect(index).toHaveLength(23);
    expect(index.map(e => e.season)).toEqual(seasons.map(seasonLabel).sort());
  });

  for (const season of seasons) {
    it(`${season}: P12 D24 C36 A24, id univoci, overall 50-95, niente chiavi vietate`, () => {
      const doc = loadSeasonDoc(seasonLabel(season));
      const counts = { P: 0, D: 0, C: 0, A: 0 };
      const ids = new Set<string>();
      for (const p of doc.players) {
        counts[p.role]++;
        ids.add(p.id);
        expect(p.overall).toBeGreaterThanOrEqual(50);
        expect(p.overall).toBeLessThanOrEqual(95);
        expect(p.baseValue).toBeGreaterThanOrEqual(1);
      }
      expect(ids.size).toBe(doc.players.length);
      for (const role of ROLES) expect(counts[role]).toBe(EXPECTED[role]);
      const keys = new Set<string>();
      collectKeys(doc, keys);
      for (const k of keys) expect(FORBIDDEN_KEYS.test(k)).toBe(false);
    });
  }
});

describe('stagioni fantacalcio — qualità', () => {
  it('match listone -> stats >= 98% su tutte le stagioni', () => {
    for (const season of seasons) {
      const seasonRows = statsRows.filter(r => r.season === season);
      const listone = loadListone(join(ROOT, LISTONE_DIR, `listone_${season}.csv`));
      let matched = 0;
      for (const l of listone) {
        const candidates = seasonRows.filter(
          r => r.club === l.club && r.role === l.role
        );
        if (findStatsMatch(l.name, candidates)) matched++;
      }
      expect(matched / listone.length).toBeGreaterThanOrEqual(0.98);
    }
  });

  it('Spearman(overall, Qu): per stagione+ruolo >= 0.65, media per ruolo >= 0.80', () => {
    const perRole: Record<FantaRole, number[]> = { P: [], D: [], C: [], A: [] };
    const detail: string[] = [];
    for (const season of seasons) {
      for (const role of ROLES) {
        const pop = statsRows.filter(r => r.season === season && r.role === role && r.pr >= 1);
        const res = computeFantaGroup(pop);
        const rho = spearman(
          res.map(r => r.overall),
          pop.map(r => r.qu)
        );
        perRole[role].push(rho);
        detail.push(`${season} ${role}: ${rho.toFixed(3)}`);
        expect(rho).toBeGreaterThanOrEqual(0.65);
      }
    }
    for (const role of ROLES) {
      const mean = perRole[role].reduce((a, b) => a + b, 0) / perRole[role].length;
      const min = Math.min(...perRole[role]);
      console.log(`Spearman ${role}: media ${mean.toFixed(3)} min ${min.toFixed(3)}`);
      expect(mean).toBeGreaterThanOrEqual(0.8);
    }
    console.log(detail.join(' | '));
  });

  it('casi noti: chi ha dominato la stagione è primo nel suo ruolo', () => {
    const cases: [string, FantaRole, string][] = [
      ['2015-2016', 'A', 'HIGUAIN'],
      ['2006-2007', 'A', 'TOTTI'],
      ['2015-2016', 'P', 'BUFFON'],
      ['2019-2020', 'A', 'IMMOBILE'],
    ];
    for (const [season, role, name] of cases) {
      const pop = statsRows.filter(r => r.season === season && r.role === role && r.pr >= 1);
      const res = computeFantaGroup(pop);
      const top = pop
        .map((r, i) => ({ row: r, res: res[i] }))
        .sort(
          (a, b) =>
            b.res.overall - a.res.overall ||
            b.res.fvStar - a.res.fvStar ||
            a.row.name.localeCompare(b.row.name)
        )[0];
      expect(`${season} ${role} -> ${top.row.name}`).toContain(name);
    }
  });

  it('casi noti 2025-26: DIMARCO domina i D, SOMMER nel listone dei P', () => {
    const pop = statsRows.filter(
      r => r.season === '2025-2026' && r.role === 'D' && r.pr >= 1
    );
    const res = computeFantaGroup(pop);
    const ranked = pop
      .map((r, i) => ({ row: r, res: res[i] }))
      .sort(
        (a, b) =>
          b.res.overall - a.res.overall ||
          b.res.fvStar - a.res.fvStar ||
          a.row.name.localeCompare(b.row.name)
      );
    expect(ranked[0].row.name).toContain('DIMARCO');
    expect(ranked[0].res.overall - ranked[1].res.overall).toBeGreaterThanOrEqual(4);

    // SOMMER: reputazione da quotazione, deve entrare nel listone P pubblicato
    const doc = loadSeasonDoc('2025-26');
    const keepers = doc.players.filter(p => p.role === 'P');
    expect(keepers.some(p => p.name.includes('SOMMER'))).toBe(true);
  });
});
