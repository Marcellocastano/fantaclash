// Genera public/data/seasons/<YYYY-YY>.json per ogni stagione presente in
// LISTE/statistiche_storiche_totali_2003_2026.csv (+ join col listone per
// misurare il tasso di match). Uso:
//   node data-pipeline/src/build/fantaSeason.ts [annoInizio, es. 2015]

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadStatsRows,
  loadListone,
  findStatsMatch,
  normalizeName,
  STATS_CSV,
  LISTONE_DIR,
} from './fantaCsv.ts';
import {
  computeFantaGroup,
  overallToBaseValue,
  overallT,
} from '../derive/fantaOverall.ts';
import type { FantaRow, FantaRole } from '../derive/fantaOverall.ts';
import type { Player } from '../../../src/types/index.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, '..', 'public', 'data', 'seasons');

const LISTONE_COUNT: Record<FantaRole, number> = { P: 12, D: 24, C: 36, A: 24 };
const ROLES: FantaRole[] = ['P', 'D', 'C', 'A'];

function seasonLabel(season: string): string {
  // 'YYYY-YYYY' -> 'YYYY-YY'
  const y = parseInt(season.slice(0, 4), 10);
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

function slug(s: string): string {
  return normalizeName(s).toLowerCase().replace(/\s+/g, '-');
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

function toPlayer(row: FantaRow, overall: number, cont: number, label: string): Player {
  const t = overallT(overall);
  const perApp = (count: number) => (row.pr > 0 ? round2(count / row.pr) : 0);
  const player: Player = {
    id: `fg-${label}-${slug(row.club)}-${slug(row.name)}-${row.role.toLowerCase()}`,
    name: row.name,
    role: row.role,
    team: row.club,
    baseValue: overallToBaseValue(overall, row.role),
    avgRating: round2(5.5 + 1.5 * t),
    goalProbability: perApp(Math.max(0, row.go)),
    assistProbability: perApp(row.assists),
    yellowCardProbability: perApp(row.yellow),
    redCardProbability: perApp(row.red),
    reliability: round2(cont),
    season: label,
    overall,
    stats: {
      appearances: row.pr,
      starts: row.ti,
      goals: Math.max(0, row.go),
      assists: row.assists,
      yellowCards: row.yellow,
      redCards: row.red,
    },
  };
  if (row.role === 'P') {
    player.stats!.goalsConceded = Math.abs(Math.min(0, row.go));
    player.stats!.penaltiesSaved = row.penScored;
    player.penaltySaveProbability =
      row.penTaken > 0 ? round2(row.penScored / row.penTaken) : 0;
  }
  return player;
}

async function buildSeason(season: string, statsRows: FantaRow[]): Promise<void> {
  const label = seasonLabel(season);
  const seasonRows = statsRows.filter(r => r.season === season);
  const listonePath = join(ROOT, '..', LISTONE_DIR, `listone_${season}.csv`);
  const listone = loadListone(listonePath);

  // join listone -> stats (misura copertura; la quotazione resta interna)
  let matched = 0;
  for (const l of listone) {
    const candidates = seasonRows.filter(r => r.club === l.club && r.role === l.role);
    if (findStatsMatch(l.name, candidates)) matched++;
  }
  const matchRate = listone.length ? matched / listone.length : 0;

  // Quotazione iniziale (reputazione): dal listone completo della stagione,
  // non filtrato, così copre anche i giocatori scartati dalla pulizia
  const fullListonePath = join(ROOT, '..', 'LISTE', season, `listone_${season}.csv`);
  for (const l of existsSync(fullListonePath) ? loadListone(fullListonePath) : listone) {
    const candidates = seasonRows.filter(r => r.club === l.club && r.role === l.role);
    const row = findStatsMatch(l.name, candidates);
    if (row && row.qi === undefined) row.qi = l.quotazioneIniziale;
  }

  // popolazione: Pr >= 1, per ruolo
  const players: Player[] = [];
  const reportParts: string[] = [];
  const popCounts: string[] = [];
  for (const role of ROLES) {
    const pop = seasonRows.filter(r => r.role === role && r.pr >= 1);
    popCounts.push(`${role}${pop.length}`);
    const results = computeFantaGroup(pop);
    const ranked = pop
      .map((r, i) => ({ row: r, res: results[i] }))
      .sort(
        (a, b) =>
          b.res.overall - a.res.overall ||
          b.res.fvStar - a.res.fvStar ||
          a.row.name.localeCompare(b.row.name)
      );
    const top = ranked.slice(0, LISTONE_COUNT[role]);
    for (const { row, res } of top) {
      players.push(toPlayer(row, res.overall, res.cont, label));
    }
    const first = ranked[0]?.res.overall ?? '-';
    const last = top[top.length - 1]?.res.overall ?? '-';
    reportParts.push(`${role}: 1°=${first} ultimo(${top.length}°)=${last}`);
  }

  players.sort((a, b) => b.overall! - a.overall! || a.name.localeCompare(b.name));

  mkdirSync(OUT_DIR, { recursive: true });
  const doc = {
    season: label,
    label: `Serie A ${label}`,
    source: 'statistiche storiche fantacalcio (dati privati, uso interno)',
    generatedAt: new Date().toISOString(),
    players,
  };
  writeFileSync(join(OUT_DIR, `${label}.json`), JSON.stringify(doc));

  console.log(
    `${season} | righe ${seasonRows.length} | pop ${popCounts.join(' ')} | ` +
      `listone ${listone.length} match ${(matchRate * 100).toFixed(1)}% | ` +
      reportParts.join(' | ')
  );
}

async function main(): Promise<void> {
  const statsRows = loadStatsRows(join(ROOT, '..', STATS_CSV));
  const seasons = [...new Set(statsRows.map(r => r.season))].sort();
  const arg = process.argv[2];
  const wanted = arg ? seasons.filter(s => s.startsWith(`${arg}-`)) : seasons;
  if (wanted.length === 0) throw new Error(`stagione non trovata: ${arg}`);

  const index: { season: string; label: string; playerCount: number }[] = [];
  for (const season of wanted) {
    await buildSeason(season, statsRows);
    const label = seasonLabel(season);
    const doc = JSON.parse(
      (await import('node:fs')).readFileSync(join(OUT_DIR, `${label}.json`), 'utf8')
    ) as { players: Player[] };
    index.push({ season: label, label: `Serie A ${label}`, playerCount: doc.players.length });
  }

  // index.json: unisci con eventuali stagioni già presenti
  const indexPath = join(OUT_DIR, 'index.json');
  let existing: typeof index = [];
  try {
    existing = JSON.parse(
      (await import('node:fs')).readFileSync(indexPath, 'utf8')
    );
  } catch {
    /* assente */
  }
  const labels = new Set(index.map(e => e.season));
  const merged = [...existing.filter(e => !labels.has(e.season)), ...index].sort(
    (a, b) => a.season.localeCompare(b.season)
  );
  writeFileSync(indexPath, JSON.stringify(merged, null, 2));
  console.log(`\nindex.json: ${merged.length} stagioni`);
}

await main();
