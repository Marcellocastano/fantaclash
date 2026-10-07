import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BotArchetype, DifficultyLevel, Player } from '../../types';
import { mean, median, RunMetrics, simulateBalanceRun, UserStyle } from './balanceHarness';

/**
 * Suite di equilibrio dell'asta (8 squadre, 100 crediti, rosa 1-2-3-2).
 * Simula aste complete su stagioni reali con l'utente guidato da quattro
 * stili di gioco e verifica integrità, economia, equilibrio e personalità.
 * Il report completo su tutte le stagioni: BALANCE_REPORT=1 (balanceReport.test.ts).
 */

const SEASONS = ['2003-04', '2007-08', '2011-12', '2015-16', '2019-20', '2024-25'];
const SEEDS = [1, 2, 3];
const STYLES: UserStyle[] = ['passivo', 'equilibrato', 'stelle', 'cecchino', 'furbo'];
const DIFFICULTIES: DifficultyLevel[] = ['normale', 'difficile'];

const runs: RunMetrics[] = [];

function loadSeason(season: string): Player[] {
  const file = join(process.cwd(), 'public', 'data', 'seasons', `${season}.json`);
  return (JSON.parse(readFileSync(file, 'utf8')) as { players: Player[] }).players;
}

const of = (d: DifficultyLevel, s?: UserStyle) =>
  runs.filter(r => r.difficulty === d && (s === undefined || r.style === s));

/** Scarto medio della forza dell'utente rispetto alla media dei bot */
const userDelta = (d: DifficultyLevel, s: UserStyle) =>
  mean(of(d, s).map(r => r.userStrength - mean(r.botStrengths)));

const archetypeMetric = (
  d: DifficultyLevel,
  a: BotArchetype,
  pick: (x: RunMetrics['byArchetype'][number]) => number
) => mean(of(d).flatMap(r => r.byArchetype).filter(x => x.archetype === a).map(pick));

beforeAll(() => {
  for (const season of SEASONS) {
    const players = loadSeason(season);
    for (const d of DIFFICULTIES) {
      for (const s of STYLES) {
        for (const seed of SEEDS) runs.push(simulateBalanceRun(season, players, d, s, seed));
      }
    }
  }
}, 120_000);

describe('equilibrio — integrità e determinismo', () => {
  it('ogni asta si completa: 8 rose 1-2-3-2, crediti coerenti, nessun doppione', () => {
    expect(runs.length).toBe(SEASONS.length * DIFFICULTIES.length * STYLES.length * SEEDS.length);
    expect(runs.every(r => r.integrityOk)).toBe(true);
  });

  it('stesso seed, stesso risultato', () => {
    const players = loadSeason('2015-16');
    const a = simulateBalanceRun('2015-16', players, 'normale', 'equilibrato', 7);
    const b = simulateBalanceRun('2015-16', players, 'normale', 'equilibrato', 7);
    expect(a).toEqual(b);
  });
});

describe.each(DIFFICULTIES)('equilibrio — economia (%s)', d => {
  it('i bot spendono in media almeno l\'85% del budget', () => {
    expect(mean(of(d).flatMap(r => r.botSpend))).toBeGreaterThanOrEqual(0.85);
  });

  it('prezzi dei migliori per ruolo tra 15 e 45, attaccanti e centrocampisti sopra i difensori', () => {
    const top = (role: Player['role']) => median(of(d).map(r => r.topPrice[role]));
    for (const role of ['P', 'D', 'C', 'A'] as const) {
      expect(top(role)).toBeGreaterThanOrEqual(15);
      expect(top(role)).toBeLessThanOrEqual(45);
    }
    expect(top('A')).toBeGreaterThan(top('D'));
    expect(top('C')).toBeGreaterThan(top('D'));
  });

  it('i prezzi seguono la qualità: Spearman prezzo-overall medio ≥ 0,85', () => {
    expect(mean(of(d).map(r => r.priceQuality))).toBeGreaterThanOrEqual(0.85);
  });

  it('i migliori 3 di ogni ruolo non si svendono: prezzo/equo mediano ≥ 0,9, 10° percentile ≥ 0,5', () => {
    const ratios = of(d).flatMap(r => r.topFairRatios).sort((a, b) => a - b);
    expect(median(ratios)).toBeGreaterThanOrEqual(0.9);
    expect(ratios[Math.floor(ratios.length * 0.1)]).toBeGreaterThanOrEqual(0.5);
  });

  it('l\'utente non porta via campioni a prezzo di saldo (< 40% dell\'equo): in media ≤ 0,2 per asta', () => {
    expect(mean(of(d).filter(r => r.style !== 'passivo').map(r => r.userCheapStars))).toBeLessThanOrEqual(0.2);
  });

  it('nessun giocatore costa più dell\'80% del budget', () => {
    expect(Math.max(...of(d).map(r => r.maxPrice))).toBeLessThanOrEqual(80);
  });

  it('durata: in media ≤ 10 rilanci per lotto, al massimo 30', () => {
    const bids = of(d).flatMap(r => r.bidsPerLot);
    expect(mean(bids)).toBeLessThanOrEqual(10);
    expect(Math.max(...bids)).toBeLessThanOrEqual(30);
  });
});

describe.each(DIFFICULTIES)('equilibrio — forza delle squadre (%s)', d => {
  it('i bot sono vicini tra loro: scarto max-min medio ≤ 3, al 95° percentile ≤ 5', () => {
    const spreads = of(d).map(r => Math.max(...r.botStrengths) - Math.min(...r.botStrengths)).sort((a, b) => a - b);
    expect(mean(spreads)).toBeLessThanOrEqual(3);
    expect(spreads[Math.floor(spreads.length * 0.95)]).toBeLessThanOrEqual(5);
  });

  it('nessuna squadra accumula più di 4 dei 10 giocatori migliori nel 95% delle aste', () => {
    const ok = of(d).filter(r => Math.max(...r.top10PerTeam) <= 4).length / of(d).length;
    expect(ok).toBeGreaterThanOrEqual(0.95);
  });

  it('chi non spende resta indietro (passivo ≤ −4 rispetto ai bot)', () => {
    expect(userDelta(d, 'passivo')).toBeLessThanOrEqual(-4);
  });

  it('una squadra equilibrata è competitiva ma non dominante (−1 ≤ scarto ≤ +1,5)', () => {
    expect(userDelta(d, 'equilibrato')).toBeGreaterThanOrEqual(-1);
    expect(userDelta(d, 'equilibrato')).toBeLessThanOrEqual(1.5);
  });

  it('comprare solo i campioni non paga: stelle sotto i bot e sotto lo stile equilibrato', () => {
    expect(userDelta(d, 'stelle')).toBeLessThanOrEqual(0);
    expect(userDelta(d, 'stelle')).toBeLessThan(userDelta(d, 'equilibrato') - 1);
  });

  it('un utente furbo (caccia ai campioni a buon prezzo) non domina: scarto ≤ +1', () => {
    expect(userDelta(d, 'furbo')).toBeLessThanOrEqual(1);
  });

  it('rilanciare solo all\'ultimo non dà vantaggi rispetto allo stile equilibrato', () => {
    expect(userDelta(d, 'cecchino')).toBeLessThanOrEqual(userDelta(d, 'equilibrato') + 0.5);
  });
});

describe('equilibrio — difficoltà', () => {
  it('in Difficile gli stili equilibrato e furbo ottengono meno che in Normale', () => {
    expect(userDelta('difficile', 'equilibrato')).toBeLessThan(userDelta('normale', 'equilibrato'));
    expect(userDelta('difficile', 'furbo')).toBeLessThan(userDelta('normale', 'furbo'));
  });
});

describe.each(DIFFICULTIES)('equilibrio — personalità (%s)', d => {
  it('l\'aggressivo spende prima del parsimonioso', () => {
    expect(archetypeMetric(d, 'aggressivo', x => x.earlySpendShare)).toBeGreaterThan(
      archetypeMetric(d, 'parsimonioso', x => x.earlySpendShare)
    );
  });

  it('il parsimonioso ottiene più overall per credito di tutti', () => {
    const pars = archetypeMetric(d, 'parsimonioso', x => x.overallPerCredit);
    for (const a of ['aggressivo', 'stratega', 'cacciatore', 'equilibrato'] as const) {
      expect(pars).toBeGreaterThan(archetypeMetric(d, a, x => x.overallPerCredit));
    }
  });

  it('lo stratega fa più chiamate "civetta" (drain) di tutti', () => {
    const strat = archetypeMetric(d, 'stratega', x => x.drainShare);
    for (const a of ['aggressivo', 'parsimonioso', 'cacciatore', 'equilibrato'] as const) {
      expect(strat).toBeGreaterThan(archetypeMetric(d, a, x => x.drainShare));
    }
  });

  it('il cacciatore vince almeno un pupillo nel 70% delle aste', () => {
    expect(archetypeMetric(d, 'cacciatore', x => (x.wonPupillo ? 1 : 0))).toBeGreaterThanOrEqual(0.7);
  });
});
