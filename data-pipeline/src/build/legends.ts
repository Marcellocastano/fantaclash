// Genera public/data/seasons/legends.json: il listone "Legends" con i
// migliori calciatori di tutte le annate (una card per giocatore, nella
// sua stagione migliore). Legge solo i JSON già generati, niente LISTE.
// Uso:
//   node data-pipeline/src/build/legends.ts

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Player } from '../../../src/types/index.ts';
import { buildLegends, LEGENDS_ID, LEGENDS_LABEL, legendTiebreak } from '../derive/legends.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, '..', 'public', 'data', 'seasons');

function main(): void {
  const files = readdirSync(OUT_DIR).filter(f => /^\d{4}-\d{2}\.json$/.test(f));
  const all: Player[] = [];
  for (const f of files) {
    const doc = JSON.parse(readFileSync(join(OUT_DIR, f), 'utf8')) as { players: Player[] };
    all.push(...doc.players);
  }

  const { players, collisions, report } = buildLegends(all);

  const doc = {
    season: LEGENDS_ID,
    label: `Serie A ${LEGENDS_LABEL}`,
    source: `I migliori giocatori delle ${files.length} stagioni di Serie A, elaborati da FantaClash`,
    generatedAt: new Date().toISOString(),
    players,
  };
  writeFileSync(join(OUT_DIR, `${LEGENDS_ID}.json`), JSON.stringify(doc));

  // Report
  console.log(`legends | annate ${files.length} | giocatori ${all.length} -> ${players.length}`);
  for (const role of ['P', 'D', 'C', 'A'] as const) {
    const sel = players.filter(p => p.role === role).sort((a, b) => b.overall! - a.overall!);
    console.log(`\n${role} (${sel.length}):`);
    for (const p of sel) {
      console.log(
        `  ${p.overall} ${p.name} — ${p.team} ${p.season} (tb ${legendTiebreak(p).toFixed(2)}, ${p.baseValue} Cr)`
      );
    }
    if (report[role].cut.length) console.log(`  tagliati: ${report[role].cut.join(' · ')}`);
  }
  if (collisions.length) {
    console.log('\nCognomi con più chiavi (controllare che siano giocatori diversi):');
    for (const c of collisions) console.log(`  ${c.surname}: ${c.keys.join(', ')}`);
  }
}

main();
