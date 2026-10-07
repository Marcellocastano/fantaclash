import { describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DifficultyLevel, Player } from '../../types';
import { mean, median, RunMetrics, simulateBalanceRun, UserStyle } from './balanceHarness';

/**
 * Report di calibrazione (non asserisce nulla): BALANCE_REPORT=1 npx vitest run balanceReport
 */
const RUN = process.env.BALANCE_REPORT === '1';
const SEEDS = Number(process.env.BALANCE_SEEDS ?? 6);

describe.skipIf(!RUN)('report di equilibrio', () => {
  it('stampa le metriche aggregate', () => {
    const dir = join(process.cwd(), 'public', 'data', 'seasons');
    const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as { season: string }[];
    const styles: UserStyle[] = ['passivo', 'equilibrato', 'stelle', 'cecchino', 'furbo'];
    const diffs: DifficultyLevel[] = ['normale', 'difficile'];
    const runs: RunMetrics[] = [];
    const t0 = Date.now();
    for (const { season } of index) {
      const players = (JSON.parse(readFileSync(join(dir, `${season}.json`), 'utf8')) as { players: Player[] }).players;
      for (const d of diffs) for (const s of styles) for (let seed = 1; seed <= SEEDS; seed++) {
        runs.push(simulateBalanceRun(season, players, d, s, seed));
      }
    }
    const ms = (Date.now() - t0) / runs.length;
    const lines: string[] = [`runs=${runs.length} ms/run=${ms.toFixed(1)} integrity=${runs.every(r => r.integrityOk)}`];
    for (const d of diffs) {
      const rd = runs.filter(r => r.difficulty === d);
      const spends = rd.flatMap(r => r.botSpend);
      const spreads = rd.map(r => Math.max(...r.botStrengths) - Math.min(...r.botStrengths));
      lines.push(`\n[${d}] bot spend mean=${mean(spends).toFixed(3)} min=${Math.min(...spends).toFixed(3)} | bot spread mean=${mean(spreads).toFixed(2)} p95=${[...spreads].sort((a, b) => a - b)[Math.floor(spreads.length * 0.95)].toFixed(2)}`);
      lines.push(`  topPrice median P=${median(rd.map(r => r.topPrice.P))} D=${median(rd.map(r => r.topPrice.D))} C=${median(rd.map(r => r.topPrice.C))} A=${median(rd.map(r => r.topPrice.A))} | maxPrice max=${Math.max(...rd.map(r => r.maxPrice))} | bids/lot mean=${mean(rd.flatMap(r => r.bidsPerLot)).toFixed(1)} max=${Math.max(...rd.flatMap(r => r.bidsPerLot))}`);
      lines.push(`  role spend share P=${mean(rd.map(r => r.roleSpendShare.P)).toFixed(2)} D=${mean(rd.map(r => r.roleSpendShare.D)).toFixed(2)} C=${mean(rd.map(r => r.roleSpendShare.C)).toFixed(2)} A=${mean(rd.map(r => r.roleSpendShare.A)).toFixed(2)}`);
      const ratios = rd.flatMap(r => r.topFairRatios).sort((a, b) => a - b);
      lines.push(`  priceQuality mean=${mean(rd.map(r => r.priceQuality)).toFixed(2)} | top3 price/fair median=${median(ratios).toFixed(2)} p10=${ratios[Math.floor(ratios.length * 0.1)].toFixed(2)} | userTop3 by style: ${styles.map(s => `${s}=${mean(rd.filter(r => r.style === s).map(r => r.userTop3)).toFixed(2)}/${mean(rd.filter(r => r.style === s).map(r => r.userCheapStars)).toFixed(2)}`).join(' ')}`);
      const top10ok = rd.filter(r => Math.max(...r.top10PerTeam) <= 3).length / rd.length;
      lines.push(`  share runs with max top10/team<=3: ${top10ok.toFixed(3)}`);
      for (const s of styles) {
        const rs = rd.filter(r => r.style === s);
        const delta = rs.map(r => r.userStrength - mean(r.botStrengths));
        lines.push(`  user ${s.padEnd(11)} delta=${mean(delta).toFixed(2)} (min ${Math.min(...delta).toFixed(2)} max ${Math.max(...delta).toFixed(2)}) spend=${mean(rs.map(r => r.userSpend)).toFixed(2)} strength=${mean(rs.map(r => r.userStrength)).toFixed(1)} botMean=${mean(rs.map(r => mean(r.botStrengths))).toFixed(1)}`);
      }
      const arch = rd.flatMap(r => r.byArchetype);
      for (const a of ['aggressivo', 'parsimonioso', 'stratega', 'cacciatore', 'equilibrato'] as const) {
        const xs = arch.filter(x => x.archetype === a);
        lines.push(`  ${a.padEnd(12)} n=${xs.length} strength=${mean(xs.map(x => x.strength)).toFixed(2)} spend=${mean(xs.map(x => x.spend)).toFixed(3)} early=${mean(xs.map(x => x.earlySpendShare)).toFixed(3)} ovr/cr=${mean(xs.map(x => x.overallPerCredit)).toFixed(2)} drain=${mean(xs.map(x => x.drainShare)).toFixed(3)}${a === 'cacciatore' ? ` pupillo=${mean(xs.map(x => (x.wonPupillo ? 1 : 0))).toFixed(3)}` : ''}`);
      }
    }
    console.log(lines.join('\n'));
  }, 600_000);
});
