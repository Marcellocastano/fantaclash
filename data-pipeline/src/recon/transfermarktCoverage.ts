// Ricognizione del dataset pubblico dcaribou/transfermarkt-datasets per la
// Serie A (competition_id = 'IT1'). Scarica i CSV ufficiali una sola volta
// in cache/ e misura copertura per stagione. Solo misura.
// Esecuzione: node src/recon/transfermarktCoverage.ts  (da data-pipeline/)

import { gunzipSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE_DIR = join(ROOT, 'cache', 'transfermarkt');
const OUT_DIR = join(ROOT, 'out', 'recon');

// URL ufficiali pubblicati nel README di dcaribou/transfermarkt-datasets
const BASE_URL = 'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data';
const FILES = ['competitions.csv.gz', 'games.csv.gz', 'appearances.csv.gz'];

async function download(name: string): Promise<Buffer> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const path = join(CACHE_DIR, name);
  if (existsSync(path)) {
    console.log(`${name}: cache`);
    return readFileSync(path);
  }
  const url = `${BASE_URL}/${name}`;
  console.log(`${name}: download da ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} per ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(path, buf);
  return buf;
}

function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const lines = text.split('\n').filter(l => l.trim() !== '');
  const parse = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  return { header: parse(lines[0]), rows: lines.slice(1).map(parse) };
}

type SeasonRow = {
  season: string;
  games: number;
  appearances: number;
  distinctPlayers: number;
};

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const [compBuf, gamesBuf, appsBuf] = await Promise.all(FILES.map(download));

  const competitions = parseCsv(gunzipSync(compBuf).toString('utf8'));
  const compIdIdx = competitions.header.indexOf('competition_id');
  const compNameIdx = competitions.header.indexOf('name');
  const it1 = competitions.rows.find(r => r[compIdIdx] === 'IT1');
  const it1Name = it1 ? it1[compNameIdx] : null;
  console.log(`competition_id 'IT1' = ${it1Name ?? 'NON TROVATO'}`);

  const games = parseCsv(gunzipSync(gamesBuf).toString('utf8'));
  const gComp = games.header.indexOf('competition_id');
  const gSeason = games.header.indexOf('season');
  const gId = games.header.indexOf('game_id');
  const it1Games = games.rows.filter(r => r[gComp] === 'IT1');
  const gameSeason = new Map<string, string>();
  const gamesPerSeason = new Map<string, number>();
  for (const r of it1Games) {
    gameSeason.set(r[gId], r[gSeason]);
    gamesPerSeason.set(r[gSeason], (gamesPerSeason.get(r[gSeason]) ?? 0) + 1);
  }

  const apps = parseCsv(gunzipSync(appsBuf).toString('utf8'));
  const aGame = apps.header.indexOf('game_id');
  const aPlayer = apps.header.indexOf('player_id');
  const interestingCols = [
    'minutes_played',
    'goals',
    'assists',
    'yellow_cards',
    'red_cards',
  ];
  const columnsPresent = Object.fromEntries(
    interestingCols.map(c => [c, apps.header.includes(c)])
  );
  const appsPerSeason = new Map<string, number>();
  const playersPerSeason = new Map<string, Set<string>>();
  for (const r of apps.rows) {
    const season = gameSeason.get(r[aGame]);
    if (!season) continue;
    appsPerSeason.set(season, (appsPerSeason.get(season) ?? 0) + 1);
    let set = playersPerSeason.get(season);
    if (!set) playersPerSeason.set(season, (set = new Set()));
    set.add(r[aPlayer]);
  }

  const seasons = [...gamesPerSeason.keys()].sort();
  const table: SeasonRow[] = seasons.map(season => ({
    season,
    games: gamesPerSeason.get(season) ?? 0,
    appearances: appsPerSeason.get(season) ?? 0,
    distinctPlayers: playersPerSeason.get(season)?.size ?? 0,
  }));

  const lines = [
    '# Copertura transfermarkt-datasets — Serie A (IT1)',
    '',
    `Fonte: ${BASE_URL} (README di dcaribou/transfermarkt-datasets).`,
    `competition_id 'IT1' = ${it1Name ?? 'NON TROVATO'}.`,
    `Stagione più vecchia presente: ${seasons[0] ?? '-'}; più recente: ${seasons[seasons.length - 1] ?? '-'}.`,
    '',
    `Colonne appearances: ${interestingCols.map(c => `${c}=${columnsPresent[c]}`).join(', ')}`,
    '',
    '| Stagione | games | appearances | giocatori distinti |',
    '| -------- | ----- | ----------- | ------------------ |',
    ...table.map(
      r => `| ${r.season} | ${r.games} | ${r.appearances} | ${r.distinctPlayers} |`
    ),
  ];
  const md = lines.join('\n') + '\n';
  writeFileSync(join(OUT_DIR, 'transfermarkt-coverage.md'), md);
  writeFileSync(
    join(OUT_DIR, 'transfermarkt-coverage.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        it1CompetitionName: it1Name,
        appearanceColumns: columnsPresent,
        earliestSeason: seasons[0] ?? null,
        latestSeason: seasons[seasons.length - 1] ?? null,
        seasons: table,
      },
      null,
      2
    )
  );
  process.stdout.write(md);
}

await main();
