import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Player } from '../../types';
import { simulateBalanceRun } from './balanceHarness';

// Benchmark tollerante delle prestazioni del simulatore: la media di 10
// aste sul listone 2015-16 deve restare sotto i 150 ms ciascuna (soglia larga: intercetta solo regressioni gravi, oggi ~5 ms).
// La soglia è larga per non fallire su macchine lente o carico variabile.
describe('benchmark prestazioni simulatore', () => {
  it('media di 10 aste 2015-16 < 150 ms ciascuna', () => {
    const file = join(process.cwd(), 'public', 'data', 'seasons', '2015-16.json');
    const players = (JSON.parse(readFileSync(file, 'utf8')) as { players: Player[] }).players;

    // Riscaldamento (JIT)
    simulateBalanceRun('2015-16', players, 'difficile', 'equilibrato', 0);

    const t0 = performance.now();
    for (let seed = 1; seed <= 10; seed++) {
      simulateBalanceRun('2015-16', players, 'difficile', 'equilibrato', seed);
    }
    const msPerRun = (performance.now() - t0) / 10;
    console.log(`benchmark: ${msPerRun.toFixed(1)} ms/asta`);
    expect(msPerRun).toBeLessThan(150);
  });
});
