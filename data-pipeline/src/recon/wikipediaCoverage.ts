// Ricognizione copertura Wikipedia (it.wiki) per le stagioni di Serie A
// 2002-2003 … 2024-2025. Solo misura: nessuna modifica al codice di gioco.
// Esecuzione: node src/recon/wikipediaCoverage.ts  (da data-pipeline/)

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getSections,
  getSectionLinks,
  getSectionWikitext,
  getNetworkRequestCount,
} from '../wiki/client.ts';
import {
  parseStatsSection,
  parseRosaSection,
  statsMetrics,
  matchRate,
  stripHtml,
} from './wikipediaParsers.ts';
import type { StatsSection } from './wikipediaParsers.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, 'out', 'recon');

const FIRST_SEASON = 2002;
const LAST_SEASON = 2024;

const EXCLUDED_PREFIXES = [
  'Serie ',
  'Coppa ',
  'Supercoppa ',
  'UEFA ',
  'Campionato ',
  'Coppa Intertoto',
];

function seasonLabel(startYear: number): string {
  return `${startYear}-${startYear + 1}`;
}

function expectedClubs(season: string): number {
  return season === '2002-2003' || season === '2003-2004' ? 18 : 20;
}

type ClubReport = {
  title: string;
  status: 'S' | 'R' | '-';
  error: string | null;
  statsRows: number;
  rowsWithBadArity: number;
  serieAAppsSum: number;
  serieAGoalsPositiveSum: number;
  serieAGoalsNegativeSum: number;
  competitions: string[];
  serieAIndex: number;
  rosaCount: number;
  matchRate: number;
};

type SeasonReport = {
  season: string;
  leaguePage: string;
  error: string | null;
  expectedClubs: number;
  clubsFound: number;
  countMismatch: boolean;
  clubs: ClubReport[];
};

async function reconClub(title: string, season: string): Promise<ClubReport> {
  const base: ClubReport = {
    title,
    status: '-',
    error: null,
    statsRows: 0,
    rowsWithBadArity: 0,
    serieAAppsSum: 0,
    serieAGoalsPositiveSum: 0,
    serieAGoalsNegativeSum: 0,
    competitions: [],
    serieAIndex: -1,
    rosaCount: 0,
    matchRate: 0,
  };
  void season;
  const sections = await getSections(title);
  if (sections === null) {
    base.error = 'pagina mancante';
    return base;
  }

  const statsSec = sections.find(
    s => stripHtml(s.line) === 'Statistiche dei giocatori'
  );
  const rosaSec = sections.find(s => s.line === 'Rosa');

  let hasStats = false;
  let parsedStats: StatsSection | undefined;
  if (statsSec) {
    const wt = await getSectionWikitext(title, statsSec.index);
    if (wt !== null) {
      parsedStats = parseStatsSection(wt);
      const m = statsMetrics(parsedStats);
      base.statsRows = m.statsRows;
      base.rowsWithBadArity = m.rowsWithBadArity;
      base.serieAAppsSum = m.serieAAppsSum;
      base.serieAGoalsPositiveSum = m.serieAGoalsPositiveSum;
      base.serieAGoalsNegativeSum = m.serieAGoalsNegativeSum;
      base.competitions = parsedStats.competitions;
      base.serieAIndex = parsedStats.serieAIndex;
      hasStats = m.hasStats;
    } else {
      base.error = 'sezione statistiche non leggibile';
    }
  }

  let rosa = null;
  if (rosaSec) {
    const wt = await getSectionWikitext(title, rosaSec.index);
    if (wt !== null) {
      rosa = parseRosaSection(wt);
      base.rosaCount = rosa.length;
    } else {
      base.error = base.error ?? 'sezione rosa non leggibile';
    }
  }

  if (parsedStats !== undefined && rosa !== null) {
    base.matchRate = matchRate(parsedStats, rosa);
  } else {
    base.matchRate = -1;
  }

  base.status = hasStats ? 'S' : base.rosaCount >= 15 ? 'R' : '-';
  return base;
}

async function reconSeason(startYear: number): Promise<SeasonReport> {
  const season = seasonLabel(startYear);
  const leaguePage = `Serie A ${season}`;
  const report: SeasonReport = {
    season,
    leaguePage,
    error: null,
    expectedClubs: expectedClubs(season),
    clubsFound: 0,
    countMismatch: false,
    clubs: [],
  };

  const sections = await getSections(leaguePage);
  const squadreSec = sections?.find(s => s.line === 'Squadre partecipanti');
  if (!sections || !squadreSec) {
    report.error = sections
      ? "sezione 'Squadre partecipanti' mancante"
      : 'pagina di lega mancante';
    return report;
  }

  const links = (await getSectionLinks(leaguePage, squadreSec.index)) ?? [];
  const clubTitles = links.filter(
    t =>
      t.endsWith(` ${season}`) &&
      !EXCLUDED_PREFIXES.some(p => t.startsWith(p))
  );
  report.clubsFound = clubTitles.length;
  report.countMismatch = clubTitles.length !== report.expectedClubs;

  for (const title of clubTitles) {
    const club = await reconClub(title, season);
    report.clubs.push(club);
    process.stdout.write(`  ${club.status} ${title}\n`);
  }
  return report;
}

function mean(values: number[]): number {
  const v = values.filter(x => x >= 0);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

function buildMarkdown(reports: SeasonReport[]): string {
  const lines: string[] = [
    '# Copertura Wikipedia — Serie A (it.wiki)',
    '',
    'S = sezione "Statistiche dei giocatori" con dati Serie A (>= 11 righe);',
    'R = solo rosa (>= 15 voci); - = nessuna delle due.',
    '',
    '| Stagione | Club (trovate/attese) | S | R | - | righe stats | matchRate medio | club non S |',
    '| -------- | --------------------- | - | - | - | ----------- | --------------- | ---------- |',
  ];
  for (const r of reports) {
    const counts = { S: 0, R: 0, '-': 0 };
    let rows = 0;
    const rates: number[] = [];
    const nonS: string[] = [];
    for (const c of r.clubs) {
      counts[c.status]++;
      rows += c.statsRows;
      if (c.matchRate >= 0) rates.push(c.matchRate);
      if (c.status !== 'S') nonS.push(`${c.title} [${c.status}]`);
    }
    const mr = rates.length ? mean(rates).toFixed(3) : '-';
    const err = r.error ? ` ERRORE: ${r.error};` : '';
    const mismatch = r.countMismatch ? ' (!)' : '';
    lines.push(
      `| ${r.season} | ${r.clubsFound}/${r.expectedClubs}${mismatch}${err} | ` +
        `${counts.S} | ${counts.R} | ${counts['-']} | ${rows} | ${mr} | ` +
        `${nonS.length ? nonS.join(', ') : '—'} |`
    );
  }
  return lines.join('\n') + '\n';
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const reports: SeasonReport[] = [];
  for (let y = FIRST_SEASON; y <= LAST_SEASON; y++) {
    const season = seasonLabel(y);
    process.stdout.write(`== ${season} ==\n`);
    reports.push(await reconSeason(y));
  }

  writeFileSync(
    join(OUT_DIR, 'wikipedia-coverage.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), networkRequests: getNetworkRequestCount(), seasons: reports }, null, 2)
  );
  const md = buildMarkdown(reports);
  writeFileSync(join(OUT_DIR, 'wikipedia-coverage.md'), md);
  process.stdout.write(`\nRichieste di rete totali: ${getNetworkRequestCount()}\n`);
  process.stdout.write(md);
}

await main();
